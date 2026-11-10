import { type HttpClient } from '../http';
import {
  type User,
  type InviteMemberRequest,
  Role,
  UserStatus,
} from '@clm/shared-types';

export class UsersEndpoint {
  constructor(private http: HttpClient) {}

  list(): Promise<User[]> {
    return this.http.get<User[]>('users');
  }

  invite(data: InviteMemberRequest): Promise<User> {
    return this.http.post<User>('users/invite', data);
  }

  updateRole(id: string, role: Role): Promise<User> {
    return this.http.patch<User>(`users/${id}/role`, { role });
  }

  updateStatus(id: string, status: UserStatus): Promise<User> {
    return this.http.patch<User>(`users/${id}/status`, { status });
  }
}

