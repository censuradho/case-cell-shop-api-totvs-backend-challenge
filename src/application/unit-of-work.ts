export abstract class UnitOfWork<TContext> {
  abstract run<T>(work: (ctx: TContext) => Promise<T>): Promise<T>;
}
