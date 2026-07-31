const poolData = {
    UserPoolId: window.APP_CONFIG.cognito.userPoolId,
    ClientId: window.APP_CONFIG.cognito.clientId
  };
  

const userPool =
  new AmazonCognitoIdentity.CognitoUserPool(poolData);

function confirmAccount() {

  const username =
      document.getElementById("username").value;

  const code =
      document.getElementById("code").value;

  const userData = {
      Username: username,
      Pool: userPool
  };

  const cognitoUser =
      new AmazonCognitoIdentity.CognitoUser(userData);

  cognitoUser.confirmRegistration(
      code,
      true,
      function (err, result) {

          if (err) {
              document.getElementById("message").innerHTML =
                  err.message;
              return;
          }

          document.getElementById("message").innerHTML =
              "Account confirmed!";

          setTimeout(function () {
              window.location.href = "login.html";
          }, 1500);
      }
  );
}