export class QueryOptionsDTO {
    skip: number;
    take: number;
    where?: Record<string, string>;
  relations?:string[]
  order?: Record<string, 'ASC' | 'DESC'>;

  }