import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class HashAdapter {
  async hashPassword(password: string): Promise<string> {
    return (await argon2.hash(password)) as string;
  }
  async compare(password: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }
}
