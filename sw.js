//Note::This code is inspired from Udacity's Offline first mobile apps course code...

const cacheName = 'restaurant-reviews-v34';
let itemsToBeCached = [
    './index.html',
    './restaurant.html',
    './css/styles.min.css',
    './js/main.min.js',
    './js/dbhelper.min.js',
    './js/restaurant_info.min.js',
    './img/webp/notAvailable.webp',
    './manifest.json'
]
for (let i = 1; i <= 10; i++)
    itemsToBeCached.push(`./img/webp/${i}.webp`);

//Caching data on install
self.addEventListener('install', event => {

    event.waitUntil(
        caches.open(cacheName).then(cache => {
            return cache.addAll(itemsToBeCached);
        })
    );
});


//Deleting old versions of cache on activation of the new service worker.
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(//Since waitUntill expects a promise to be passed.
                keys.map(key => {
                    if (key != cacheName) caches.delete(key);
                })
            )
        }).catch(err => {
            console.log(err);
        })
    )
});

//responding with cached data...
self.addEventListener('fetch', event => {

    const url = event.request.url;
    const urlObj = new URL(url);
    const acceptedIndexPathNames = [
        '/',
        '/index.html'
    ]
    const acceptedRestPathNames = [
        '/restaurant.html'
    ]

    if (urlObj.origin.startsWith('chrome-extension://')) return;

    if (acceptedIndexPathNames.includes(urlObj.pathname))
        event.respondWith(
            caches.open(cacheName).then(cache => {
                return cache.match('./index.html').then(resp => resp);
            }).catch(err => {
                console.log(err);
            })
        )
    else if (acceptedRestPathNames.includes(urlObj.pathname))
        event.respondWith(
            caches.open(cacheName).then(cache => {
                return cache.match('./restaurant.html').then(resp => resp);
            }).catch(err => {
                console.log(err);
            })
        )
    else if (urlObj.pathaname !== '/restaurants' && urlObj.origin === location.origin)

        event.respondWith(
            caches.open(cacheName).then(cache => {
                return cache.match(url).then(resp => {
                    return resp;
                }).catch(err => {
                    console.log(err);
                })
            })
        )


});


self.addEventListener('sync', function(event) {
    
    if (event.tag === 'offline') {
        
        event.waitUntil(
            caches.open('failed-requests')
            .then(cache => {
                console.log('matching the cache in service worker');
                
                return  cache.match('http://localhost:1337/reviews/')
                .then(resp => resp.json())
                .then(data => {

                    let formData = new FormData();

                    formData.append('restaurant_id', data.id);
                    formData.append('name', data.name);
                    formData.append('rating', data.rating);
                    formData.append('comments', data.comment);

                    return fetch(data.url, {
                    method: 'POST',
                    body: formData
                    })

                }).then(resp => resp.json())
                .then(resp => {
                    //As mentioned in the specs here, https://wicg.github.io/BackgroundSync/spec/
                    //Promises are nested to be in the same scope of 'resp' variable.
                    clients.matchAll({
                        includeUncontrolled: true
                    }).then(clients => {
                        for (const client of clients){
                            client.postMessage(resp);
                        }
                    })
                
                })
            })
        )
    }
  
});
