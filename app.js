(function () {

  function login (e) {
    if (e) {
      e.preventDefault();
    }
    const redirectUri = encodeURIComponent(window.location.href);

    console.log('altocloud redirect uri', redirectUri);
    window.location = 'https://login.mypurecloud.com/oauth/authorize' +
                '?response_type=token' +
                '&client_id=47040138-6227-4f37-af9e-e907aab9577f' +
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
    console.log('altocloud logged in')
    authToken = params.access_token;
    renderLiveNow();
  } else {
    console.log('altocloud logging in');
    login();
  }

  function renderLiveNow() {
    console.log('altocloud renderingLiveNow', authToken);
    var searchParams = (new URL(document.location)).searchParams;

    // This function will get called whenever a visit is clicked in live now
    // In this example, we simple log the visit, however, you can react however you wish to this event
    function onVisitClick(visit) {
      console.log("Visit selected", visit);
    }

    var liveNow = new Altocloud.LiveNow({
      onVisitClick: onVisitClick,
      locale: searchParams.get('locale') || 'en',
      env: 'app',
    });

    liveNow.render('#altocloud-live-now');
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
