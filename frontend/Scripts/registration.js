const poolData = {
    UserPoolId: window.APP_CONFIG.cognito.userPoolId,
    ClientId: window.APP_CONFIG.cognito.clientId
  };
  
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

async function register() {

  let username =
      document.getElementById("username").value;

  let email =
      document.getElementById("email").value;

  let password =
      document.getElementById("password").value;

  const attributeList = [];

  attributeList.push(
      new AmazonCognitoIdentity.CognitoUserAttribute({
          Name: "email",
          Value: email
      })
  );

  userPool.signUp(
      username,
      password,
      attributeList,
      null,
      function (error, result) {

          if (error) {
              document.getElementById("message").innerHTML =
                  error.message;
              return;
          }

          window.location.href =
          "confirm.html?username=" + encodeURIComponent(username); //at this point browser converts to https://ricemill.shruti-singla.com/confirm.html?username=shruti
      }
  );
}