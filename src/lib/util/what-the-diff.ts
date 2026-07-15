// Copyright (c) 2016 Katrina Uychaco

// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following
// conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.

/**
 * Parser for raw git diff output, ported from the `what-the-diff` PEG.js grammar.
 *
 * The grammar is line-oriented, so this is a recursive-descent parser over lines with
 * backtracking on alternatives, mirroring the PEG rules one method per rule.
 */

export interface RegularHunk {
  oldStartLine: number;
  oldLineCount: number;
  newStartLine: number;
  newLineCount: number;
  heading: string;
  lines: string[];
}

export interface MergeConflictHunk {
  ourStartLine: number;
  ourLineCount: number;
  theirStartLine: number;
  theirLineCount: number;
  baseStartLine: number;
  baseLineCount: number;
  heading: string;
  lines: string[];
}

export type Hunk = RegularHunk | MergeConflictHunk;

export interface AddedFileDiff {
  status: 'added';
  oldPath: null;
  newPath: string;
  oldMode: null;
  newMode: string;
  hunks: Hunk[];
  binary: boolean;
}

export interface DeletedFileDiff {
  status: 'deleted';
  oldPath: string;
  newPath: null;
  oldMode: string;
  newMode: null;
  hunks: Hunk[];
  binary: boolean;
}

export interface ModifiedFileDiff {
  status: 'modified';
  oldPath: string;
  newPath: string;
  oldMode: string;
  newMode: string;
  hunks: Hunk[];
  binary: boolean;
}

export interface RenamedOrCopiedFileDiff {
  status: 'renamed' | 'copied';
  oldPath: string;
  newPath: string;
  oldMode?: string;
  newMode?: string;
  similarity: number;
  hunks: Hunk[];
}

export interface UnmergedFileDiff {
  status: 'unmerged';
  filePath: string;
  binary: boolean;
  hunks?: Hunk[];
}

export type FileDiff =
  | AddedFileDiff
  | DeletedFileDiff
  | ModifiedFileDiff
  | RenamedOrCopiedFileDiff
  | UnmergedFileDiff;

interface FileModes {
  oldMode: string | null;
  newMode: string | null;
}

interface ChangedFileModes {
  oldMode: string;
  newMode: string;
}

interface Patch {
  hunks: Hunk[];
}

function postProcessDiff(
  fileName: string,
  fileModes: FileModes | null,
  patch: Patch | null,
  binary: boolean,
): AddedFileDiff | DeletedFileDiff | ModifiedFileDiff {
  const hunks = patch ? patch.hunks : [];
  if (fileModes && fileModes.oldMode && !fileModes.newMode) {
    return {
      newPath: null,
      oldPath: fileName,
      newMode: null,
      oldMode: fileModes.oldMode,
      hunks,
      status: 'deleted',
      binary,
    };
  } else if (fileModes && !fileModes.oldMode && fileModes.newMode) {
    return {
      oldPath: null,
      newPath: fileName,
      oldMode: null,
      newMode: fileModes.newMode,
      hunks,
      status: 'added',
      binary,
    };
  } else if (fileModes && fileModes.oldMode && fileModes.newMode) {
    return {
      newPath: fileName,
      oldPath: fileName,
      oldMode: fileModes.oldMode,
      newMode: fileModes.newMode,
      hunks,
      status: 'modified',
      binary,
    };
  } else {
    throw new Error('file modes missing');
  }
}

function postProcessMergeConflictDiff(
  filePath: string,
  patch: Patch | null,
  binary: boolean,
): UnmergedFileDiff {
  const diff: UnmergedFileDiff = { filePath, status: 'unmerged', binary };
  if (patch) {
    diff.hunks = patch.hunks;
  }
  return diff;
}

function postProcessSimilarityDiff(
  operation: 'rename' | 'copy',
  similarity: number,
  oldFile: string,
  newFile: string,
  fileModes: ChangedFileModes | null,
  patch: Patch | null,
): RenamedOrCopiedFileDiff {
  const diff: RenamedOrCopiedFileDiff = {
    oldPath: oldFile,
    newPath: newFile,
    hunks: patch ? patch.hunks : [],
    status: operation === 'copy' ? 'copied' : 'renamed',
    similarity,
  };
  if (fileModes) {
    diff.oldMode = fileModes.oldMode;
    diff.newMode = fileModes.newMode;
  }
  return diff;
}

function parseHunkRange(start: string, count: string | undefined) {
  return { start: parseInt(start, 10), count: count === undefined ? 1 : parseInt(count, 10) };
}

class DiffParser {
  private readonly lines: string[];
  private pos = 0;

  constructor(input: string) {
    const lines = input.split(/\r?\n/);
    // A trailing newline in the input produces one empty final element, not an empty line.
    if (lines[lines.length - 1] === '') {
      lines.pop();
    }
    this.lines = lines;
  }

  parseDiffs(): FileDiff[] {
    const diffs: FileDiff[] = [];
    let diff: FileDiff | null;
    while ((diff = this.diff()) !== null) {
      diffs.push(diff);
    }
    if (this.pos < this.lines.length) {
      throw new Error(
        `Unable to parse diff at line ${this.pos + 1}: ${JSON.stringify(this.lines[this.pos])}`,
      );
    }
    return diffs;
  }

  // Consumes the current line and advances if it matches, otherwise stays put.
  private matchLine(pattern: RegExp): RegExpExecArray | null {
    if (this.pos >= this.lines.length) {
      return null;
    }
    const match = pattern.exec(this.lines[this.pos]);
    if (match) {
      this.pos++;
    }
    return match;
  }

  private diff(): FileDiff | null {
    return (
      this.binaryMergeConflictDiff() ??
      this.renameOrCopyDiff() ??
      this.mergeConflictDiff() ??
      this.unmergedPath() ??
      this.binaryDiff() ??
      this.regularDiff()
    );
  }

  private binaryMergeConflictDiff(): UnmergedFileDiff | null {
    const start = this.pos;
    const path = this.mergeConflictHeaderLine();
    if (path === null) {
      return null;
    }
    if (!this.indexLine() || !this.binaryDeclaration()) {
      this.pos = start;
      return null;
    }
    return postProcessMergeConflictDiff(path, null, true);
  }

  private renameOrCopyDiff(): RenamedOrCopiedFileDiff | null {
    const start = this.pos;
    if (!this.matchLine(/^diff [^ \t\r]+ [^\r]+$/)) {
      return null;
    }
    const modes = this.changedFileModes();
    const similarity = this.similarityIndex();
    if (similarity === null) {
      this.pos = start;
      return null;
    }
    const from = this.renameCopyFrom();
    if (!from) {
      this.pos = start;
      return null;
    }
    const to = this.renameCopyTo();
    if (!to) {
      this.pos = start;
      return null;
    }
    const indexModes = this.indexLine()?.modes ?? null;
    const patch = this.binaryDeclaration() ? null : this.patch();
    return postProcessSimilarityDiff(
      from.operation,
      similarity,
      from.file,
      to.file,
      modes ?? indexModes,
      patch,
    );
  }

  private mergeConflictDiff(): UnmergedFileDiff | null {
    const start = this.pos;
    const path = this.mergeConflictHeaderLine();
    if (path === null) {
      return null;
    }
    if (!this.indexLine()) {
      this.pos = start;
      return null;
    }
    return postProcessMergeConflictDiff(path, this.patch(), false);
  }

  private mergeConflictHeaderLine(): string | null {
    const match = this.matchLine(/^diff --cc ([^\r]+)$/);
    return match && match[1];
  }

  private unmergedPath(): UnmergedFileDiff | null {
    const match = this.matchLine(/^\* Unmerged path ([^\r]+)$/);
    return match && postProcessMergeConflictDiff(match[1], null, false);
  }

  private binaryDiff(): AddedFileDiff | DeletedFileDiff | ModifiedFileDiff | null {
    const start = this.pos;
    const fileName = this.diffHeaderLine();
    if (fileName === null) {
      return null;
    }
    const fileModes = this.fileModeSection();
    this.patchHeader();
    if (!this.binaryDeclaration()) {
      this.pos = start;
      return null;
    }
    return postProcessDiff(fileName, fileModes, null, true);
  }

  private regularDiff(): AddedFileDiff | DeletedFileDiff | ModifiedFileDiff | null {
    const fileName = this.diffHeaderLine();
    if (fileName === null) {
      return null;
    }
    const fileModes = this.fileModeSection();
    return postProcessDiff(fileName, fileModes, this.patch(), false);
  }

  private diffHeaderLine(): string | null {
    const match = this.matchLine(/^diff [^ \t\r]+ ([^\r]+)$/);
    if (!match) {
      return null;
    }
    // The captured field is `a/path b/path`; both halves are the same length, so the
    // second name starts one character past the midpoint.
    const fileNames = match[1];
    return fileNames.slice(Math.floor(fileNames.length / 2 + 1));
  }

  private binaryDeclaration(): boolean {
    return this.matchLine(/^Binary files [^\r]+$/) !== null;
  }

  private fileModeSection(): FileModes | null {
    const explicit = this.newOrDeletedFileMode() ?? this.changedFileModes();
    const index = this.indexLine();
    return explicit ?? index?.modes ?? null;
  }

  private newOrDeletedFileMode(): FileModes | null {
    const match = this.matchLine(/^(new|deleted) file mode ([^\r]+)$/);
    if (!match) {
      return null;
    }
    return match[1] === 'new'
      ? { oldMode: null, newMode: match[2] }
      : { oldMode: match[2], newMode: null };
  }

  private changedFileModes(): ChangedFileModes | null {
    const start = this.pos;
    const oldMatch = this.matchLine(/^old mode ([^\r]+)$/);
    if (!oldMatch) {
      return null;
    }
    const newMatch = this.matchLine(/^new mode ([^\r]+)$/);
    if (!newMatch) {
      this.pos = start;
      return null;
    }
    return { oldMode: oldMatch[1], newMode: newMatch[1] };
  }

  // Distinguishes "no index line" (null) from "index line without a mode" ({ modes: null }),
  // since some rules require the line to be present regardless of the mode.
  private indexLine(): { modes: ChangedFileModes | null } | null {
    const withMode = this.matchLine(/^index [^ \t\r]+ ([^\r]+)$/);
    if (withMode) {
      return { modes: { oldMode: withMode[1], newMode: withMode[1] } };
    }
    if (this.matchLine(/^index [^ \t\r]+$/)) {
      return { modes: null };
    }
    return null;
  }

  private similarityIndex(): number | null {
    const match = this.matchLine(/^similarity index (\d+)%$/);
    return match && parseInt(match[1], 10);
  }

  private renameCopyFrom(): { operation: 'rename' | 'copy'; file: string } | null {
    const match = this.matchLine(/^(rename|copy) from ([^\r]+)$/);
    return match && { operation: match[1] as 'rename' | 'copy', file: match[2] };
  }

  private renameCopyTo(): { operation: 'rename' | 'copy'; file: string } | null {
    const match = this.matchLine(/^(rename|copy) to ([^\r]+)$/);
    return match && { operation: match[1] as 'rename' | 'copy', file: match[2] };
  }

  private patch(): Patch | null {
    if (!this.patchHeader()) {
      return null;
    }
    const hunks: Hunk[] = [];
    let hunk: Hunk | null;
    while ((hunk = this.hunk()) !== null) {
      hunks.push(hunk);
    }
    return { hunks };
  }

  private patchHeader(): boolean {
    const start = this.pos;
    if (!this.matchLine(/^--- [^\r]+$/)) {
      return false;
    }
    if (!this.matchLine(/^\+\+\+ [^\r]+$/)) {
      this.pos = start;
      return false;
    }
    return true;
  }

  private hunk(): Hunk | null {
    const start = this.pos;
    const header = this.mergeConflictHunkHeader() ?? this.regularHunkHeader();
    if (!header) {
      return null;
    }
    const lines: string[] = [];
    let line: string | null;
    while ((line = this.hunkLine()) !== null) {
      lines.push(line);
    }
    if (lines.length === 0) {
      this.pos = start;
      return null;
    }
    return { ...header, lines };
  }

  private mergeConflictHunkHeader(): Omit<MergeConflictHunk, 'lines'> | null {
    const match = this.matchLine(
      /^@@@ -(\d+)(?:,(\d+))? -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@@([^\r]*)$/,
    );
    if (!match) {
      return null;
    }
    const ourRange = parseHunkRange(match[1], match[2]);
    const baseRange = parseHunkRange(match[3], match[4]);
    const theirRange = parseHunkRange(match[5], match[6]);
    return {
      ourStartLine: ourRange.start,
      ourLineCount: ourRange.count,
      theirStartLine: theirRange.start,
      theirLineCount: theirRange.count,
      baseStartLine: baseRange.start,
      baseLineCount: baseRange.count,
      heading: match[7].trim(),
    };
  }

  private regularHunkHeader(): Omit<RegularHunk, 'lines'> | null {
    const match = this.matchLine(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@([^\r]*)$/);
    if (!match) {
      return null;
    }
    const oldRange = parseHunkRange(match[1], match[2]);
    const newRange = parseHunkRange(match[3], match[4]);
    return {
      oldStartLine: oldRange.start,
      oldLineCount: oldRange.count,
      newStartLine: newRange.start,
      newLineCount: newRange.count,
      heading: match[5].trim(),
    };
  }

  private hunkLine(): string | null {
    if (this.pos >= this.lines.length) {
      return null;
    }
    const line = this.lines[this.pos];
    if (!/^[+\- \\][^\r]*$/.test(line)) {
      return null;
    }
    this.pos++;
    return line;
  }
}

export function parse(input: string): FileDiff[] {
  return new DiffParser(input).parseDiffs();
}
