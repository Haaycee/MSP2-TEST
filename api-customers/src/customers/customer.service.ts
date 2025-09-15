import { Injectable } from '@nestjs/common';

@Injectable()
export class CustomerService {
  getAll(): string[] {
    return [
        "Customer 1",
        "Customer 2"
    ];
  }

  findOneById(id: string): string {
    return "Customer " + id;
  }

  create() {
    return "Creating customer";
  }

  update(id: string) {
    return "Updating customer " + id;
  }

  delete(id: string) {
    return "Deleting customer " + id;
  }
}
