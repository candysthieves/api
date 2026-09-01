import { GetUsersCountType } from '../view-types/users/get-users-count.type.js';

export class UsersMapper {
  static toUsersCountView(count: number): GetUsersCountType {
    return {
      count: count,
    };
  }
}
