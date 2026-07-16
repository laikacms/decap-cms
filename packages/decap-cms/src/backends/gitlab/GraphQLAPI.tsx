import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { setContext } from 'apollo-link-context';
import { createHttpLink } from 'apollo-link-http';

import API from './API';
import * as queries from './queries';

import type { CmsImplementationFile } from '@/lib/util/index';
import type { NormalizedCacheObject } from 'apollo-cache-inmemory';
import type { ApolloQueryResult } from 'apollo-client';
import type { Config, FileEntry } from './API';

const NO_CACHE = 'no-cache';

function batch<T>(items: T[], maxPerBatch: number, action: (items: T[]) => void) {
  for (let index = 0; index < items.length; index = index + maxPerBatch) {
    const itemsSlice = items.slice(index, index + maxPerBatch);
    action(itemsSlice);
  }
}

export default class GraphQLAPI extends API {
  graphQLClient: ApolloClient<NormalizedCacheObject>;

  constructor(config: Config) {
    super(config);
    this.graphQLClient = this.getApolloClient();
  }

  getApolloClient() {
    const authLink = setContext((_, { headers }) => {
      return {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...headers,
          authorization: this.token ? `token ${this.token}` : '',
        },
      };
    });
    const httpLink = createHttpLink({ uri: this.graphQLAPIRoot });
    return new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
      defaultOptions: {
        watchQuery: {
          fetchPolicy: NO_CACHE,
          errorPolicy: 'ignore',
        },
        query: {
          fetchPolicy: NO_CACHE,
          errorPolicy: 'all',
        },
      },
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
      blobsPaths = await this.graphQLClient.query({
        query: queries.files,
        variables: { repo: this.repo, branch, path, recursive, cursor },
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

    const blobPromises: Promise<ApolloQueryResult<BlobResult>>[] = [];
    batch(paths, 90, slice => {
      blobPromises.push(
        this.graphQLClient.query({
          query: queries.blobs,
          variables: {
            repo: this.repo,
            branch: this.branch,
            paths: slice,
          },
          fetchPolicy: 'cache-first',
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

    const commitPromises: Promise<ApolloQueryResult<CommitResult>>[] = [];
    batch(paths, 8, slice => {
      commitPromises.push(
        this.graphQLClient.query({
          query: queries.lastCommits(slice),
          variables: {
            repo: this.repo,
            branch: this.branch,
          },
          fetchPolicy: 'cache-first',
        }),
      );
    });

    const [blobsResults, commitsResults] = await Promise.all([
      (await Promise.all(blobPromises)).map(
        (result: ApolloQueryResult<BlobResult>) => result.data.project.repository.blobs.nodes,
      ),
      (await Promise.all(commitPromises)).map(
        (result: ApolloQueryResult<CommitResult>) =>
          Object.values(result.data.project.repository)
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
