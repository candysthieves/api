export type EmailTemplateType = {
  subject: string;
  html: string;
};

export const emailTemplates = {
  registration(code: string) {
    return {
      subject: 'Confirm your Lumos account',
      html: `
        <h1>Thank you for your registration</h1>
        <p>
          To finish registration please follow the link below:
          <a href="https://somesite.com/confirm-email?code=${code}">
            Complete registration
          </a>
        </p>
      `,
    };
  },

  passwordRecovery(code: string) {
    return {
      subject: 'Password recovery',
      html: `
        <h1>Password recovery</h1>
        <p>
          To finish password recovery please follow the link below:
          <a href="https://somesite.com/password-recovery?recoveryCode=${code}">
            Recover password
          </a>
        </p>
      `,
    };
  },
};
