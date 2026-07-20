import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';

import API from './API';
import * as queries from './queries';

import type { CmsImplementationFile } from '@/lib/util/index';
import type { Config, FileEntry } from './API';

const NO_CACHE = 'no-cache';

function batch<T>(items: T[], maxPerBatch: number, action: (items: T[]) => void) {
  for (let index = 0; index < items.length; index = index + maxPerBatch) {
    const itemsSlice = items.slice(index, index + maxPerBatch);
    action(itemsSlice);
  }
}

export default class GraphQLAPI extends API {
  graphQLClient: ApolloClient;

  constructor(config: Config) {
    super(config);
    this.graphQLClient = this.getApolloClient();
  }

  getApolloClient() {
    const authLink = new SetContextLink(({ headers }) => {
      return {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...headers,
          authorization: this.token ? `token ${this.token}` : '',
        },
      };
    });
    const httpLink = new HttpLink({ uri: this.graphQLAPIRoot });
    return new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
      // don't append the extensions.clientLibrary telemetry blob to requests
      enhancedClientAwareness: { transport: false },
    });
  }

  reset() {
    return this.graphQLClient.resetStore();
  }

  listAllFilesGraphQL = async (path: string, recursive: boolean, branch: string) => {
    const files: FileEntry[] = [];
    let blobsPaths;
    let cursor;
    do {
      blobsPaths = await this.graphQLClient.query<any>({
        query: queries.files,
        variables: { repo: this.repo, branch, path, recursive, cursor },
        // mirrors the old client-wide defaultOptions; v4 gates typed
        // defaultOptions behind a module augmentation we don't want to ship
        fetchPolicy: NO_CACHE,
        errorPolicy: 'all',
      });
      files.push(...blobsPaths.data.project.repository.tree.blobs.nodes);
      cursor = blobsPaths.data.project.repository.tree.blobs.pageInfo.endCursor;
    } while (blobsPaths.data.project.repository.tree.blobs.pageInfo.hasNextPage);

    return files;
  };

  readFilesGraphQL = async (files: CmsImplementationFile[]) => {
    const paths = files.map(({ path }) => path);

    type BlobResult = {
      project: { repository: { blobs: { nodes: { id: string, data: string }[] } } },
    };

    const blobPromises: Promise<ApolloClient.QueryResult<BlobResult>>[] = [];
    batch(paths, 90, slice => {
      blobPromises.push(
        this.graphQLClient.query<BlobResult>({
          query: queries.blobs,
          variables: {
            repo: this.repo,
            branch: this.branch,
            paths: slice,
          },
          fetchPolicy: 'cache-first',
          errorPolicy: 'all',
        }),
      );
    });

    type LastCommit = {
      id: string,
      authoredDate: string,
      authorName: string,
      author?: {
        name: string,
        username: string,
        publicEmail: string,
      },
    };

    type CommitResult = {
      project: { repository: { [tree: string]: { lastCommit: LastCommit } } },
    };

    const commitPromises: Promise<ApolloClient.QueryResult<CommitResult>>[] = [];
    batch(paths, 8, slice => {
      commitPromises.push(
        this.graphQLClient.query<CommitResult>({
          query: queries.lastCommits(slice),
          variables: {
            repo: this.repo,
            branch: this.branch,
          },
          fetchPolicy: 'cache-first',
          errorPolicy: 'all',
        }),
      );
    });

    const [blobsResults, commitsResults] = await Promise.all([
      (await Promise.all(blobPromises)).map(
        (result: ApolloClient.QueryResult<BlobResult>) => result.data!.project.repository.blobs.nodes,
      ),
      (await Promise.all(commitPromises)).map(
        (result: ApolloClient.QueryResult<CommitResult>) =>
          Object.values(result.data!.project.repository)
            .map(({ lastCommit }: any) => lastCommit)
            .filter(Boolean) as LastCommit[],
      ),
    ]);

    const blobs = blobsResults.flat().map(result => result.data) as string[];
    const metadata = commitsResults.flat().map(({ author, authoredDate, authorName }) => ({
      author: author ? author.name || author.username || author.publicEmail : authorName,
      updatedOn: authoredDate,
    }));

    const filesWithData = files.map((file, index) => ({
      file: { ...file, ...metadata[index] },
      data: blobs[index],
    }));
    return filesWithData;
  };

  listAllFiles = async (path: string, recursive = false, branch = this.branch) => {
    return this.listAllFilesGraphQL(path, recursive, branch);
  };
}
