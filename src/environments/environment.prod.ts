export const environment = {
  production: true,
  firebaseConfig: {
    apiKey: "AIzaSyCz7MNsr3ZKeKFPAtDe3pjhilHT3RPNWOA",
    authDomain: "demonth.nl",
    databaseURL: "https://demonth-55207.firebaseio.com",
    projectId: "demonth-55207",
    storageBucket: "demonth-55207.appspot.com",
    messagingSenderId: "737770166448",
    appId: "1:737770166448:web:b9d2ebaf1a379aaf848375",
    measurementId: "G-X32671LRDR"
  },
  authConfig: {
    enableFirestoreSync: true, // enable/disable autosync users with firestore
    toastMessageOnAuthSuccess: false, // whether to open/show a snackbar message on auth success - default : true
    authGuardFallbackURL: '/login', // url for unauthenticated users - to use in combination with canActivate feature on a route
    //authGuardLoggedInURL: '/account', // url for authenticated users - to use in combination with canActivate feature on a route
    passwordMaxLength: 60, // `min/max` input parameters in components should be within this range.
    passwordMinLength: 8, // Password length min/max in forms independently of each componenet min/max.
    // Same as password but for the name
    nameMaxLength: 30,
    nameMinLength: 2,
    guardProtectedRoutesUntilEmailIsVerified: false,
    enableEmailVerification: false
  },
  cookieConfig: {
    "cookie": {
      "domain": "demonth.nl"
    },
    "position": "bottom-left",
    "theme": "edgeless",
    "palette": {
      "popup": {
        "background": "#000000",
        "text": "#ffffff",
        "link": "#ffffff"
      },
      "button": {
        "background": "#fbc3bc",
        "text": "#ffffff",
        "border": "transparent"
      }
    },
    "type": "info",
    "content": {
      "message": "This website uses cookies to ensure you get the best experience on our website. By continuing to use our website, you agree to this.",
      "dismiss": "Got it!",
      "link": "Terms of Service",
      "href": "https://91ae87f9-c713-4d55-90b3-1f385f8f8569.filesusr.com/ugd/071e61_72fd32cce50441889bf46ff90a9636b3.pdf",
      "policy": "Cookie Policy"
    }
  },
  abTestConfig: {
    versions: ['productsFirst', 'preferencesFirst'],
    scope: 'orderOrder',
    expiration: 30,
    weigths: { productsFirst: 80, preferencesFirst: 20} 
  }
};
