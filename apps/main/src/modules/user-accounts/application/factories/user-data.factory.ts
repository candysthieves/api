import { Prisma } from '../../../../generated/prisma/client.js';
import { UpdateProfileDto } from '../../api/dto/update-profile.dto.js';
import { DateTime } from 'luxon';
import { UserUpdateInput } from '../../../../generated/prisma/models/User.js';

export class UserDataFactory {
  static prepareCreateData(
    email: string,
    username: string,
    password: string,
    confirmationExpiresAt: Date,
    isEmailConfirmed: boolean = false,
    firstName: string | null = null,
    lastName: string | null = null,
  ): Prisma.UserCreateInput {
    return {
      email,
      username,
      password,
      confirmationCode: crypto.randomUUID(),
      confirmationExpiresAt,
      isEmailConfirmed: isEmailConfirmed,
      firstName: firstName,
      lastName: lastName,
    };
  }

  static prepareUpdateProfileData(dto: UpdateProfileDto): UserUpdateInput {
    return {
      username: dto.username,
      firstName: dto.firstName,
      lastName: dto.lastName,
      // country: dto.country,
      // city: dto.city,
      aboutMe: dto.aboutMe,

      dateOfBirth: dto.dateOfBirth
        ? DateTime.fromISO(dto.dateOfBirth, { zone: 'utc' })
            .startOf('day')
            .toJSDate()
        : undefined,
    };
  }

  static prepareConfirmEmailData(): Prisma.UserUpdateInput {
    return {
      isEmailConfirmed: true,
      // confirmationCode: null,
    };
  }

  static prepareChangePasswordData(
    passwordHash: string,
  ): Prisma.UserUpdateInput {
    return {
      password: passwordHash,
      passwordRecoveryCode: null,
      passwordRecoveryExpiresAt: null,
    };
  }

  static preparePasswordRecoveryCodeData(
    passwordRecoveryCode: string,
    expiresAt: Date,
  ): Prisma.UserUpdateInput {
    return {
      passwordRecoveryCode: passwordRecoveryCode,
      passwordRecoveryExpiresAt: expiresAt,
    };
  }

  static prepareResendEmailData(
    confirmationCode: string,
    confirmationExpiresAt: Date,
  ): Prisma.UserUpdateInput {
    return {
      confirmationCode,
      confirmationExpiresAt,
    };
  }
}
