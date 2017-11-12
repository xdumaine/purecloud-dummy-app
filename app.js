(function () {
  function login () {
    const redirectUri = encodeURIComponent(window.location.href);
    window.location = 'https://login.mypurecloud.com/oauth/authorize' +
                '?response_type=token' +
                '&client_id=6b9f791c-86ef-4f7a-af85-3f3520dd0975' +
                '&redirect_uri=' + redirectUri;
  }

  const loginButton = document.getElementById('login');

  const params = {};
  let authToken;
  if (window.location.hash && window.location.hash.length > 1) {
    const hashParams = window.location.hash.substr(1).split('&');
    hashParams.forEach(param => {
      const [key, value] = param.split('=');
      params[key] = value;
    });
  }

  if (params.access_token) {
    authToken = params.access_token;
    loginButton.remove();
  } else {
    loginButton.addEventListener('click', login);
    return;
  }

  function fetchData() {
    const headers = new window.Headers();
    headers.set('Authorization', `bearer ${authToken}`);
    return window.fetch('https://api.mypurecloud.com/api/v2/users/me', { headers })
      .then(r => r.json())
      .then(result => {
        document.getElementById('header').innerText = 'Hello ' + result.name;

        const img = document.createElement('img');
        img.src = result.images[0].imageUri;
        document.body.append(img);

        const pre = document.createElement('pre');
        pre.innerText = JSON.stringify(result, null, 2);
        document.body.append(pre);
      });
  }

  fetchData();
})();
