// Simple query builder to help with Prisma filtering and sorting
export class QueryBuilder {
  public query: Record<string, any>;
  public prismaQuery: Record<string, any>;

  constructor(query: Record<string, any>) {
    this.query = query;
    this.prismaQuery = { where: {}, orderBy: {} };
  }

  filter(searchableFields: string[] = []) {
    const queryObj = { ...this.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'searchTerm'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Handle precise matches
    if (Object.keys(queryObj).length > 0) {
      this.prismaQuery.where = { ...this.prismaQuery.where, ...queryObj };
    }

    // Handle search term
    if (this.query.searchTerm && searchableFields.length > 0) {
      const searchTerm = this.query.searchTerm as string;
      this.prismaQuery.where.OR = searchableFields.map((field) => ({
        [field]: { contains: searchTerm, mode: 'insensitive' },
      }));
    }

    return this;
  }

  sort() {
    if (this.query.sort) {
      const sortField = (this.query.sort as string).split(',').join(' ');
      const order = sortField.startsWith('-') ? 'desc' : 'asc';
      const field = sortField.replace('-', '');
      this.prismaQuery.orderBy = { [field]: order };
    } else {
      this.prismaQuery.orderBy = { createdAt: 'desc' };
    }
    return this;
  }
}
