import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

@Injectable()
export class HashAdapter {
  async hashPassword(password: string): Promise<string> {
    return hash(password);
  }
  async compare(password: string, hash: string): Promise<boolean> {
    return verify(hash, password);
  }
}
