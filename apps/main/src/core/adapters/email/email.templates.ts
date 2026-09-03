export type EmailTemplateType = {
  subject: string;
  html: string;
};

export const emailTemplates = {
  registration(code: string, clientUrl: string) {
    return {
      subject: 'Confirm your Lumos account',
      html: `
        <h1>Thank you for your registration</h1>
        <p>
          To finish registration please follow the link below:
          <a href="${clientUrl}/verify?code=${code}">
            Complete registration
        </p>
        <p>
          To finish registration please follow the link below:
          <a href="https://dev.lumosapp.net:3000/verify?code=${code}">
            Complete registration[LOCAL LINK]
        </p>
      `,
    };
  },

  passwordRecovery(code: string, clientUrl: string) {
    return {
      subject: 'Password recovery',
      html: `
        <h1>Password recovery</h1>
        <p>
          To finish password recovery please follow the link below:
          <a href="${clientUrl}/create-new-password?recoveryCode=${code}">
            Recover password
          </a>
        </p>
        <p>
          To finish password recovery please follow the link below:
          <a href="https://dev.lumosapp.net:3000/create-new-password?recoveryCode=${code}">
            Recover password[LOCAL LINK]
          </a>
        </p>
      `,
    };
  },
};
