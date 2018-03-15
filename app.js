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
    function onVisitClick (visit) {
      console.log('Visit selected', visit);
      routeTointeraction(visit);
    }

    var liveNow = new Altocloud.LiveNow({
      onVisitClick: onVisitClick,
      locale: searchParams.get('locale') || 'en',
      env: 'app',
    });

    liveNow.render('#altocloud-live-now');
  }

  const headers = new window.Headers();
  headers.set('Authorization', `bearer ${authToken}`);
  headers.set('Content-Type', 'application/javascript');

  async function fetchData() {
    const response = await window.fetch('https://api.mypurecloud.com/api/v2/users/me', { headers });
    const result = await response.json();
    document.getElementById('header').innerText = 'Hello ' + result.name;

    const img = document.createElement('img');
    img.src = result.images[0].imageUri;
    document.body.append(img);

    const pre = document.createElement('pre');
    pre.innerText = JSON.stringify(result, null, 2);
    document.body.append(pre);
  }

  function buildAnalyticsQuery (name) {
      const start = new Date();
      start.setDate(start.getDate() - 1);
      const end = new Date();
      return {
         interval: `${start.toISOString()}/${end.toISOString()}`,
         order: 'asc',
         orderBy: 'conversationStart',
         paging: {
          pageSize: 25,
          pageNumber: 1
         },
         segmentFilters: [
          {
           type: 'or',
           predicates: [
            {
             type: 'dimension',
             dimension: 'participantName',
             operator: 'matches',
             value: name
            }
           ]
          }
         ]
        }
  }

  async function getConversation (id) {
      const response = await window.fetch('https://api.mypurecloud.com/api/v2/conversations/' + id, { headers });
      const result = await response.json();
      return result;
  }

  async function routeTointeraction (visit) {
      console.log('altocloud routing to interaction');
      const visitId = visit.id;
      const customerId = visit.customer && visit.customer.id;
      const customerName = visit.customer && visit.customer.displayName;
      if (!customerName) {
          console.log('no customer name found on visit', visit);
          return;
      }

      const query = buildAnalyticsQuery(customerName);
      const response = await window.fetch('https://api.mypurecloud.com/api/v2/analytics/conversations/details/query', {
          method: 'POST',
          headers,
          body: JSON.stringify(query)
      });
      const result = await response.json();

      const findMatch = async function (id) {
          let match;
          let count = 0;
          for (let i = result.conversations.length - 1; i > 0; i--) {
              const conversation = result.conversations[i];
              console.log('found conversation', conversation);
              const conversationdetails = await getConversation(conversation.conversationId);
              const customer = conversationdetails.participants.find(p => p.purpose === 'customer');
              const cCustomerId = customer.attributes['context.customerId'];
              const cVisitId = customer.attributes['context.customField1'];
              if (id === cCustomerId || id === cVisitId) {
                  if (!match) {
                      match = conversation.conversationId;
                  }
                  count++;
              }
          }
          return { match, count };
      }
      const sendMatch = function (id) {
          window.parent.postMessage({
              action: 'showInteractionDetails',
              protocol: 'purecloud-client-apps',
              conversationId: id
          }, 'https://apps.mypurecloud.com');
      }
      if (result && result.conversations && result.conversations.length) {
          let results = await findMatch(visitId);
          if (results && results.match) {
              sendMatch(results.match);
              window.parent.postMessage({
                    action: 'showToast',
                    type: 'info',
                    title: 'Visit located', message: 'Showing interaction associated with this visit.'
                }, 'https://apps.mypurecloud.com');
              return;
          }
          results = await findMatch(customerId);
          if (results && results.match) {
              sendMatch(results.match);
              let message;
              if (results.count === 1) {
                  message = `No interaction found for this visit. Showing the most recent interaction for ${customerName}.`;
              } else {
                  message = `No interaction found for this visit. ${customerName} has contacted support ${results.count} times in the last 30 days. Showing the most recent interaction.`;
              }
              window.parent.postMessage({
                    action: 'showToast',
                    type: 'info',
                    title: 'Customer located',
                    message
                }, 'https://apps.mypurecloud.com');
              return;
          }
      }
      window.parent.postMessage({
            action: 'showToast',
            type: 'info',
            title: 'Interaction not found', message: 'No matching interaction was found for this visit or customer.'
        }, 'https://apps.mypurecloud.com');
  }

  fetchData();
})();
