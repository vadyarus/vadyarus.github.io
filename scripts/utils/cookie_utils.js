function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
  let expires = "expires="+d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  let name = cname + "=";
  let ca = document.cookie.split(';');
  for(let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

// Generate and save the user id cookie
function check_user_id(){
  let user_id = getCookie('user_id');
  if(user_id != "") {
    //console.log('found user id cookie');
  }
  else {
      // generate a seven digit number for the user_id variable
      user_id = Math.random() * 10000000 | 0;

      if(user_id != "" && user_id != null) {
          setCookie('user_id', user_id, 28);
      }
  }
};