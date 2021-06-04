import clock from "clock";
import document from "document";
import { preferences } from "user-settings";
import * as util from "../common/utils";
import { HeartRateSensor } from "heart-rate";
import { battery } from "power";
import { goals } from "user-activity";

//---------------------------------------------------------------
// 
//---------------------------------------------------------------
import { me as appbit } from "appbit";
import { today } from "user-activity";

//---------------------------------------------------------------
// globals
//---------------------------------------------------------------
     
var STEP_GOAL=25000; // todo get these from fitbit instead of hardcoding
var CAL_GOAL=2000;  // todo get these from fitbit instead of hardcoding
var bmr=2400; //
var BMR=bmr;
var global_seconds;
//
import { user } from "user-profile";




//---------------------------------------------------------------
// clock
//---------------------------------------------------------------


// Update the clock every minute
clock.granularity = "seconds";
var old_date;
// Get a handle on the <text> element
const myLabel = document.getElementById("clock");
var global_minutes=0;
// Update the <text> element every tick with the current time
//console.log(today.adjusted.steps+"=====================");

var military_hours=0;
var STEPS_PER_MINUTE=(549/(4*60+47))*60;
clock.ontick = (evt) => {
  
 
  let today2 = evt.date; // TODO change name since today is reserved 
  
  var parsed=(today2.toString().match(/[\w\d]+/g));
  
  //save date so we can reset stats each new day.
  
 let batterypower=(Math.floor(battery.chargeLevel) + "%");
  document.getElementById("battery").text=batterypower;
  

  

  let hours = today2.getHours();
  military_hours=hours;
  if (preferences.clockDisplay === "12h") {
    // 12h format
    
    hours = hours % 12 || 12;
  } else {
    // 24h format
    hours = util.zeroPad(hours);
  }
  let mins = util.zeroPad(today2.getMinutes());
  myLabel.text = `${hours}:${mins}`;
  
  //makes seconds bounce left and right.
  var offset = parsed[6]%2;
  var standard=230;

  document.getElementById('seconds').x=standard+offset*4;
  var hours_count = util.zeroPad(today2.getHours());
  global_minutes=hours_count*60+parseInt(mins)+(parsed[6]/60);// TODO what is parsed[6]/60?
   
  var seconds= parsed[6];
  global_seconds=seconds;
  document.getElementById('seconds').text=`${parsed[6]}`;
  document.getElementById('normalThinBar').width=seconds/60*SCREEN_WIDTH;
  
  document.getElementById('date').text=`${parsed[0]} ${parsed[1]} ${parsed[2]}`;
  
  renderGoalHistory();//todo set this to 1day iterval
}

//---------------------------------------------------------------
// reset stats
//---------------------------------------------------------------
function getSteps(){
   let steps =prettyNumber(today.adjusted.steps);
    let stepsInt =(today.adjusted.steps);
      var pace= (STEP_GOAL/15)*(military_hours-7); // hourly pace
  document.getElementById('steps').text=prettyNumber(stepsInt);

    var steps_left=STEP_GOAL-parseInt(today.adjusted.steps);
  var steps_time_spent=today.adjusted.steps/STEPS_PER_MINUTE;
  if(steps_left<0){
    steps_left=0;
  }
  
  //TODO get steps from last minute
  //TODO use prettySeconds() function
  var time_left=(((steps_left)/STEPS_PER_MINUTE)); //minutes

  
  document.getElementById('stepsTimeLeft').text=prettyMinutes(time_left);
  document.getElementById('stepsTimeSpent').text=prettyMinutes(steps_time_spent);
  
}


//---------------------------------------------------------------
// reset stats
//---------------------------------------------------------------
function resetStats(){
     counter=0;
     cals=0;
}
//---------------------------------------------------------------
// heart rate
//---------------------------------------------------------------
const heartrate = document.getElementById("heartrate");
import { HeartRateSensor } from "heart-rate";

if (HeartRateSensor) {
   console.log("This device has a HeartRateSensor!");
   const hrm = new HeartRateSensor();
   hrm.addEventListener("reading", () => {
      var pad='';
      if(hrm.heartRate<100){
        pad='0';
      }
      heartrate.text=pad+hrm.heartRate;
      print(hrm.heartRate);
     
     //console.log(hrm.timestamp);
   });
   hrm.start();
} else {
   console.log("This device does NOT have a HeartRateSensor!");
}










//---------------------------------------------------------------
//  Print the hearate info
//---------------------------------------------------------------


var counter=0;
var cals=0;
var MAX_RATE=14;
 var SCREEN_WIDTH=299;

var bmr_per_minute=bmr/(60*24);
function print(x){
  
  //import { goals } from "user-activity";
  //goals.adjusted.steps
  //var sdk_calories=today.local.calories;
  var sdk_calories=today.adjusted.calories;
  
  var current_bmr=global_minutes*bmr_per_minute;
  
  var extra_cals=(sdk_calories-current_bmr).toFixed(0);
  
  document.getElementById('alt').text=extra_cals;
  
  //document.getElementById('points').text=sdk_calories+"-"+((0-bmr).toFixed(1));
  
  getMinuteHistory(extra_cals);
  
}


//---------------------------------------------------------------
// displays a checkmark if user hit goal for that day.
// versa2 only holds the previous 6 days of history.
//---------------------------------------------------------------
import { me as appbit } from "appbit";
import { minuteHistory, dayHistory } from "user-activity";
function renderGoalHistory(){
    if (appbit.permissions.granted("access_activity")) {
      // query the previous 5 minutes step data
    //  const minuteRecords = minuteHistory.query({ limit: 5 });

     // minuteRecords.forEach((minute, index) => {
      //  console.log(`${minute.steps || 0} steps. ${index + 1} minute(s) ago.`);
      //});

      // query all days history step data
      const dayRecords = dayHistory.query({ limit: 10 }); // versea 2 only has previous 6 days saved
     var week_cal_total=0;
      var week_steps_total=0;
      var CAL_REST=2400; //cals burned while resting
      var flags=[];
      dayRecords.forEach((day, index) => {
        var day_calories=day.calories-CAL_REST;

        week_cal_total+=(day.calories-CAL_REST);
        week_steps_total+=day.steps;
        document.getElementById('bonus').text=prettyNumber(week_cal_total/index)+
                   " ... "+prettyNumber(week_steps_total/index);
        if(day_calories >=CAL_GOAL){
          flags.push('✅'); // emoji that are not supported on clockface will break all emojis

          }else{
            flags.push('⚪️');
          }

      });

      document.getElementById('flags').text=(flags.reverse().join(''));
    }

}
//--------------------------------------------------------------
//
//--------------------------------------------------------------
var BASE_SPEED=11.11; // calories per minute than can be reached with somewhat easy effort
                   // so that the calculations dont shoot up when user rests.
function getMinuteHistory(done_cals){
      const minRecords = minuteHistory.query({ limit: 1 }); // versea 2 only has previous 6 days saved
 
 
   var cals_left=CAL_GOAL-done_cals;
  
  if(cals_left<0){
     cals_left=0;
     }
   minRecords.forEach((min, index) => {
   var flag='';
  //console.log(`${minute.steps || 0} steps. ${index + 1} minute(s) ago.`);
     var real_burn=(min.calories-bmr_per_minute);
     var real_burn_org=real_burn;
    document.getElementById('lastMinuteCalories').text=real_burn.toFixed(1);
     if(real_burn<BASE_SPEED){
       real_burn=BASE_SPEED;
       flag='>';
     }
    var time_left = (cals_left/real_burn);
    document.getElementById('calorieETA').text=prettyMinutes(time_left)+flag;
     
     //the SDK cals are a minute behind to guesstimate down to the second
     
     done_cals =parseFloat(done_cals)+ parseFloat(((real_burn_org)/60)*global_seconds);
     document.getElementById('calorieBar').width=(done_cals/CAL_GOAL)*SCREEN_WIDTH;
     
     var cal_time_spent=done_cals/BASE_SPEED;
     if(cal_time_spent<0){
       cal_time_spent=0;
     }
     document.getElementById('calorieTimeSpent').text=prettyMinutes(cal_time_spent);
    
  });
}

//--------------------------------------------------------------
//
//--------------------------------------------------------------
function prettyNumber(x) {
    return x.toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

//---------------------------------------------------------------
//  
//---------------------------------------------------------------
function prettyMinutes(minutes){
  

  var seconds=minutes*60; // minutes is float so you can get seconds.
  
  var pretty=new Date(seconds * 1000).toISOString().substr(11, 8)
  return pretty;
}
//---------------------------------------------------------------
// 
//---------------------------------------------------------------
function prettySeconds(seconds){
  
  return seconds;
}
