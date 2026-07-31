const poolData = {
  UserPoolId: window.APP_CONFIG.cognito.userPoolId,
  ClientId: window.APP_CONFIG.cognito.clientId
};

console.log(poolData);
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

function login() {

  const username =
      document.getElementById("username").value;

  const password =
      document.getElementById("password").value;

      console.log("Username sent:", username);
      console.log("Password length:", password.length);

  const authenticationDetails =
      new AmazonCognitoIdentity.AuthenticationDetails({
          Username: username,
          Password: password
      });

  const userData = {
      Username: username,
      Pool: userPool
  };


  const cognitoUser =
      new AmazonCognitoIdentity.CognitoUser(userData);

  cognitoUser.authenticateUser(authenticationDetails, {



      onSuccess: async function (result) {
        const accessToken =
        result.getAccessToken().getJwtToken();
        console.log(accessToken);

        //we need to decode this token and send the sub as the body of the fetch request 
        const payload =
        JSON.parse(atob(accessToken.split('.')[1]));
        console.log(payload.sub);
        console.log(payload.username);

        localStorage.setItem(
          "accessToken",
          accessToken
      );
  
      const idToken = result.getIdToken().getJwtToken();

      localStorage.setItem("idToken", idToken);
      
      console.log(idToken);
  
      localStorage.setItem(
          "refreshToken",
          result.getRefreshToken().getToken()
      );
  
          
          //store the user information in the db before we move to home page 
          const response = await fetch(
            `${window.APP_CONFIG.api.baseUrl}/login-container-cdk`,
            {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + idToken,
                    "Content-Type": "application/json"
                },
                body:JSON.stringify({
                  username: username,
                  sub:payload.sub
              })
                
            }
        );

          // Go to the home page
          window.location.href = "home-page.html";
      },

      onFailure: function (err) {

          document.getElementById("message").innerHTML =
              err.message;
      }

  });
}