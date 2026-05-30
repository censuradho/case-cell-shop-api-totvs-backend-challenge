export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
}
