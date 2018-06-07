//Note::This code is inspired from Udacity's Offline first mobile apps course code...

const cacheName = 'restaurant-reviews-v31';
let itemsToBeCached = [
    './index.html',
    './restaurant.html',
    './css/styles.css',
    './js/main.js',
    './js/dbhelper.js',
    './js/restaurant_info.js',
    './img/notAvailable.jpg',
    './img/loading.gif',
    './manifest.json'
]
for (let i = 1; i <= 10; i++)
    itemsToBeCached.push(`./img/${i}.jpg`);

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
        '/mws-restaurant-stage-1',
        '/mws-restaurant-stage-1/',
        '/mws-restaurant-stage-1/index.html',
        '/',
        '/index.html'
    ]
    const acceptedRestPathNames = [
        '/mws-restaurant-stage-1/restaurant.html',
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
