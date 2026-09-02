import {BOOKING_CONFIG} from './booking-config.js?v=20260831-1';
export async function liveBookingApi(){
  if(!BOOKING_CONFIG.liveEnabled||!BOOKING_CONFIG.appCheckSiteKey)throw Error('Az éles foglalás még nincs megnyitva. A bemutatót az oldal alján tudod kipróbálni.');
  const [{initializeApp},{getAuth,signInAnonymously,signInWithEmailAndPassword,signOut},{getFunctions,httpsCallable},{initializeAppCheck,ReCaptchaV3Provider}]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js'),import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-check.js')]);
  const app=initializeApp({apiKey:'AIzaSyBakBKouiEi2KaMUD1a_lB0SHPzUqNiMsw',authDomain:'ovexi-6ef38.firebaseapp.com',projectId:'ovexi-6ef38',appId:'1:370083022451:web:4e3ba562d07641fcef4c06'},'booking');
  initializeAppCheck(app,{provider:new ReCaptchaV3Provider(BOOKING_CONFIG.appCheckSiteKey),isTokenAutoRefreshEnabled:true});
  const auth=getAuth(app),functions=getFunctions(app,'europe-west1');await auth.authStateReady();
  async function call(name,data,owner=false){if(!auth.currentUser){if(owner)throw Error('Jelentkezz be a saját naptáradba.');await signInAnonymously(auth);}if(owner&&auth.currentUser.isAnonymous)throw Error('Jelentkezz be a saját naptáradba.');return (await httpsCallable(functions,name,{timeout:35000})(data)).data;}
  return {demo:false,identity:()=>auth.currentUser?.uid||"",publicConfig:data=>call('bookingPublicConfig',data),availability:data=>call('bookingAvailability',data),createBooking:data=>call('bookingCreate',data),cancelBooking:data=>call('bookingCancel',data),ownerDay:data=>call('bookingOwnerDay',data,true),ownerMoveSlots:data=>call('bookingOwnerMoveSlots',data,true),ownerMove:data=>call('bookingOwnerMove',data,true),ownerStatus:data=>call('bookingOwnerStatus',data,true),login:(email,password)=>signInWithEmailAndPassword(auth,email,password),logout:()=>signOut(auth),isOwnerSignedIn:()=>Boolean(auth.currentUser&&!auth.currentUser.isAnonymous)};
}
