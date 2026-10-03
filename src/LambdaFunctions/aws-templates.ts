"use strict";

exports.handler = async (event, context, callback) => {
  const email = event.request.userAttributes.email;
  // const link = `https://tekrowe.auth.us-east-2.amazoncognito.com/?userName=${email}&confirmation_code=${event.request.codeParameter}`;
  const link = `https://apla.auth.us-east-2.amazoncognito.com/confirmUser?client_id=xyz&user_name=${event.request.userAttributes.sub}&confirmation_code=${event.request.codeParameter}`;
  const resetPasswordLink = `https://app-dev.aplahub.com/confirm-password?email=${email}&code=${event.request.codeParameter}`;
  const name = event.request.userAttributes.name;
  const template = (name, link) => `<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Email Verification</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background-color: #f4f3f6;">
    <div style="background-image: url('https://apla-email-template.s3.us-east-2.amazonaws.com/lineson.png'); background-repeat: no-repeat; background-size: cover; width: 100%; min-height: 100vh; display: flex; flex-direction: column; align-items: center;">
      <div style="margin-top: 30px;">
        <img src="https://apla-email-template.s3.us-east-2.amazonaws.com/aplalog.png" alt="Logo" style="width: 147px; height: 88px;" />
      </div>
      <div style="background-color: #ffffff; width: 850px; height: 600px; margin-top: 8px; margin-bottom: 58px; border-radius: 20px; overflow: auto; display: flex; flex-direction: column; align-items: center; justify-content: space-evenly;">
        <div style="width: 152px; height: 152px; margin: 0 auto;">
          <img src="https://apla-email-template.s3.us-east-2.amazonaws.com/verifymail.svg" alt="Mail Icon" style="width: 100%; height: 100%;" />
        </div>
        <div style="font-size: 36px; font-weight: 600; margin-top: 20px;">Verify your email address</div>
        <div style="font-size: 26px; font-weight: 500; color: #8b8b8b; width: 90%; text-align: center;">
          Thanks for signing up with us. Click on the button below to verify your email address.
        </div>
        <a href=${link} role="button" style="background-color: #8d2247; color: #fff; font-size: 26px; font-weight: 600; font-family: sans-serif; text-align: center; width: 339px; height: 72px; border-radius: 5px; display: flex; align-items: center; justify-content: center; text-decoration: none; cursor: pointer;">Verify your email</a>
      </div>
      <div class=${email}></div>
    </div>
 
  </body>
</html>

`;
  const signUpTemplate = (name, link) => `<!DOCTYPE html>

  <html lang="en">

  <head>
  
    <meta charset="UTF-8" />
  
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
    <title>Email Verification</title>
  
  </head>
  
  <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background-color: #f4f3f6; background-image: url('https://apla-email-template.s3.us-east-2.amazonaws.com/lineson.png'); background-repeat: no-repeat; background-size: cover;">
  
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="80%" style=" min-height: 100vh;">
  
      <tr>
  
        <td align="center" style="margin-top: 30px;">
  
          <img src="https://apla-email-template.s3.us-east-2.amazonaws.com/aplalog.png" alt="Logo" width="147" height="88" style="display: block;">
  
        </td>
  
      </tr>
  
      <tr>
  
        <td align="center" valign="top">
  
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 1181px; max-height:100vh; margin-top: 20px; margin-bottom: 58px; border-radius: 20px; background-color: #ffffff; padding-top:20px">
               <tr>
  
              <td align="center" style="margin-top: 20px;">
  
                <br><br><br><br>
  
              </td>
  
            </tr>
            <tr>
  
              <td align="center">
  
                <img src="https://apla-email-template.s3.us-east-2.amazonaws.com/verify_email.png" alt="Mail Icon" width="152" height="152" style="display: block;">
  
              </td>
  
            </tr>
  
            <tr>
  
              <td align="center" style="margin-top: 20px;">
  
                <h1 style="font-size: 36px; font-weight: 600;">Verify your email address</h1>
  
              </td>
  
            </tr>
  
            <tr>
  
              <td align="center">
  
                <p style="font-size: 26px; font-weight: 500; color: #8b8b8b; width: 90%; text-align: center;">
  
                  Thanks for signing up with us. Click on the button below to verify your email address.
  
                </p>
  
              </td>
  
            </tr>
  
            <tr>
  
              <td align="center">
  
                <a href=${link} style="background-color: #8d2247; color: #fff; font-size: 26px; font-weight: 500; font-family: 'Poppins', sans-serif; text-align: center; width: 339px; height: 72px; border-radius: 5px; display: block; text-decoration: none; line-height: 72px;">Verify your email</a>
  
              </td>
  
            </tr>
  
           
             <tr>
  
              <td align="center" style="margin-top: 20px;">
  
                <br><br><br><br>
  
              </td>
  
            </tr>
  
          </table>
  
        </td>
  
      </tr>
  
    </table>
    <div class=${email}></div>
  
  </body>
  
  </html>
`;

  const templateInvite = (name, email, code) => `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Team Invitation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background-color: #f4f3f6; background-image: url('https://apla-email-template.s3.us-east-2.amazonaws.com/lineson.png'); background-repeat: no-repeat; background-size: cover;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="80%" style="  min-height: 100vh;">
        <tr>
          <td align="center" style="margin-top: 30px;">
            <img src="https://apla-email-template.s3.us-east-2.amazonaws.com/aplalog.png" alt="Logo" width="147" height="88" style="display: block;">
          </td>
        </tr>
        <tr>
          <td align="center" valign="top">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 1181px; max-height:100vh; margin-top: 20px; margin-bottom: 58px; border-radius: 20px; background-color: #ffffff; padding-top:20px">
                <tr>
                <td align="center" style="margin-top: 20px;">
                  <br><br><br><br>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <img src="https://apla-email-template.s3.us-east-2.amazonaws.com/invitation.png" alt="Mail Icon" width="152" height="152" style="display: block;">
                </td>
              </tr>
              <tr>
                <td align="center" style="margin-top: 20px;">
                  <h1 style="font-size: 36px; font-weight: 600;">Join Apla's Team</h1>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <p style="font-size: 26px; font-weight: 500; color: #8b8b8b; width: 90%; text-align: center;">
                    You have been invited to join Apla’s team.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 0px 35px">
                  <p style="font-size: 26px; font-weight: 500; color: #8b8b8b; width: 100%; text-align: center;">
                    We’ve created an account for you that is linked to Apla’s team. This will enable you and the team to collaborate.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 0px 35px">
                  <p style="font-size: 26px; font-weight: 500; color: #8b8b8b; width: 100%; text-align: center;">
                    Please use the following credentials to login to your Apla’s account. Once logged in, you may update the password associated with your account.
                  </p>
                </td>
              </tr>
              <tr>
                <td align="start" style="padding: 0px 35px">
                  <p style="font-size: 26px; font-weight: 500; color: #151515; width: 90%; text-align: left ;">Email: ${email}</p>
                  <p style="font-size: 26px; font-weight: 500; color: #151515; width: 90%; text-align: left;">Password: ${code}</p>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <a href="https://app-dev.aplahub.com/login" style="background-color: #8d2247; color: #fff; font-size: 26px; font-weight: 500; font-family: 'Poppins', sans-serif; text-align: center; width: 378px; height: 72px; border-radius: 5px; display: block; text-decoration: none; line-height: 72px;">Accept Team Invitation</a>
                </td>
              </tr>
              <tr>
                <td align="center" style="margin-top: 20px;">
                  <br><br><br><br>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <div class=${name}></div>
    </body>
    </html>
  
  `;

  const resetPassword = (name, email, code) => `
    <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Forgot password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background-color: #f4f3f6; background-image: url('https://apla-email-template.s3.us-east-2.amazonaws.com/lineson.png');  background-repeat: no-repeat; background-size: cover;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="80%"  style=" min-height: 100vh;">
          <tr>
            <td align="center" style="margin-top: 30px;">
              <img src="https://apla-email-template.s3.us-east-2.amazonaws.com/aplalog.png" alt="Logo" width="147" height="88" style="display: block;">
            </td>
          </tr>
          <tr>
            <td align="center" valign="top">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 1181px; max-height:100vh; margin-top: 20px; margin-bottom: 30px; border-radius: 20px; background-color: #ffffff; padding-top:80px">
                <tr>
                  <td align="center">
                    <img src="https://apla-email-template.s3.us-east-2.amazonaws.com/forgot_password.png" alt="Mail Icon" width="152" height="152" style="display: block;">
                  </td>
                </tr>
                <tr>
                  <td align="center" style="margin-top: 20px;">
                    <h1 style="font-size: 36px; font-weight: 600;">Password reset</h1>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="font-size: 26px; font-weight: 500; color: #8b8b8b; width: 90%; text-align: center;">
                      We're sending you this email because you requested a password reset. Click on the link below to create a new password:
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href=${resetPasswordLink} style="background-color: #8d2247; color: #fff; font-size: 26px; font-weight: 500; font-family: 'Poppins', sans-serif; text-align: center; width: 378px; height: 72px; border-radius: 5px; display: block; text-decoration: none; line-height: 72px;">Reset Your Password</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="margin-top: 20px;">
                    <p style="font-size: 26px; font-weight: 500; color: #8b8b8b; width: 90%; text-align: center;">
                      If you didn't request a password reset, you can ignore this email. Your password will not be changed.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <br><br><br><br>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <div class=${name}></div>
        <div class=${email}></div>
      </body>
      </html>
  `;

  if (event.triggerSource === "CustomMessage_SignUp") {
    event.response = {
      emailSubject: "Tekrowe | Confirm your email",
      emailMessage: signUpTemplate(name, link),
    };
  } else if (event.triggerSource === "CustomMessage_AdminCreateUser") {
    event.response = {
      emailSubject: "Tekrowe | Signup Invitation",
      emailMessage: templateInvite(
        name,
        event.request.usernameParameter,
        event.request.codeParameter
      ),
    };
  } else if (event.triggerSource === "CustomMessage_ForgotPassword") {
    event.response = {
      emailSubject: "Tekrowe | Reset password",
      emailMessage: resetPassword(
        name,
        event.request.usernameParameter,
        event.request.codeParameter
      ),
    };
  }
  callback(null, event);
};
