import clock from "clock";
import document from "document";
import { preferences } from "user-settings";
import * as util from "../common/utils";
import { HeartRateSensor } from "heart-rate";
import { battery } from "power";
import { goals } from "user-activity";
import { user } from "user-profile";
import { me as appbit } from "appbit";
import { today } from "user-activity";

import { minuteHistory, dayHistory} from "user-activity";

//---------------------------------------------------------------
// global variables 
//---------------------------------------------------------------
var BMR = (user.bmr || 1800); 
var CAL_GOAL;
var global_seconds;
var BASE_SPEED = 3; // calories per minute that can be reached with somewhat easy effort used for metric.
var calorie_correction_percentage = 0.4;
var MAX_RATE = 14;
var SCREEN_WIDTH = 299;
var bmr_per_minute = BMR / (60 * 24);
var global_done_calories;


//-----------------------used by if statement get heartrate
const heartrate = document.getElementById("heartrate");
clock.granularity = "seconds";
const myLabel = document.getElementById("clock");
var global_minutes = 0;
var STEP_PACE = 110;


//----------------------------------------
// initilize constants to match user profile
//----------------------------------------

if (appbit.permissions.granted("access_activity")) {
    CAL_GOAL = goals.calories || 3000;
    CAL_GOAL = CAL_GOAL - BMR;
    console.log("cal_goal (minus bmr) is :" + CAL_GOAL);

} else {
    console.log("permission not granted for access_activity (you need to edit the json file to allow)");
}

//---------------------------------------------------------------
// clock
//
//---------------------------------------------------------------


// Update the clock every minute

clock.ontick = (evt) => {


    let today2 = evt.date; // TODO change name since 'today' is reserved word

    var parsed = (today2.toString().match(/[\w\d]+/g));

    //save date so we can reset stats each new day.

    let batterypower = (Math.floor(battery.chargeLevel) + "%");
    document.getElementById("battery").text = batterypower;

    let hours = today2.getHours();
    
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
    var offset = parsed[6] % 2;
    var standard = 230;

    document.getElementById('seconds').x = standard + offset * 4;
    var hours_count = util.zeroPad(today2.getHours());
    global_minutes = hours_count * 60 + parseInt(mins) + (parsed[6] / 60); // TODO what is parsed[6]/60?

    var seconds = parsed[6];
    global_seconds = seconds;
    document.getElementById('seconds').text = `${parsed[6]}`;
    document.getElementById('normalThinBar').width = seconds / 60 * SCREEN_WIDTH;

    document.getElementById('date').text = `${parsed[0]} ${parsed[1]} ${parsed[2]}`;

    renderGoalHistory(); // TODO don't call this so often
    
}



//---------------------------------------------------------------
// create interval to update& render heart rate every second.
//---------------------------------------------------------------



if (HeartRateSensor) {
    console.log("This device has a HeartRateSensor!");
    const hrm = new HeartRateSensor();
    hrm.addEventListener("reading", () => {
        var pad = '';
        if (hrm.heartRate < 100) {
            pad = '0';
        }
        heartrate.text = pad + hrm.heartRate;
        print(hrm.heartRate);

        //console.log(hrm.timestamp);
    });
    hrm.start();
} else {
    console.log("This device does NOT have a HeartRateSensor!");
}

//---------------------------------------------------------------
//  print(x)
//                                       Print the hearate info
// side effect: renders extra_extracalories
// prereq     : need today imported
//---------------------------------------------------------------




function print(x) {

  
    var sdk_calories = today.adjusted.calories;

    var current_bmr = global_minutes * bmr_per_minute;

    var extra_cals = reduceMinute(sdk_calories).toFixed(0);

    document.getElementById('extra_calories').text = extra_cals; 

    global_done_calories = extra_cals;
    getMinuteHistory(extra_cals);

}



//---------------------------------------------------------------------
// reduceMinute(x)
//          fitbit calorie calculations are overly optimistic so reduce them by
//          40%
//---------------------------------------------------------------------


function reduceMinute(x) {

    var total_minutes = global_minutes;

    // how many minutes passed today?



    x = x - (total_minutes * bmr_per_minute);
    x = x - (x * calorie_correction_percentage);
    return x;
}

//---------------------------------------------------------------------
// reduce(x)
//          fitbit calorie calculations are overly optimistic so reduce them by
//          40%
//---------------------------------------------------------------------


function reduce(x) {
     x=x-BMR;
    x = x - (x * calorie_correction_percentage);
 
    return x;
}

//---------------------------------------------------------------
// renderGoalHistory()
//           displays a checkmark if user hit goal for that day.
//           versa2 only holds the previous 6 days of history.
// side effect : renders average and flags.
//---------------------------------------------------------------


function renderGoalHistory() {
    if (appbit.permissions.granted("access_activity")) {

        // query all days history step data
        const dayRecords = dayHistory.query({
            limit: 10
        }); // versa 2 only has previous 6 days saved
        var week_cal_total = 0;
        var week_steps_total = 0;

        var flags = [];

        if ((global_done_calories)> (CAL_GOAL)) {
            flags.push('✅');
        } else {
            flags.push('❓');
        }
        dayRecords.forEach((day, index) => {
            var day_calories = day.calories;

            week_cal_total += reduce(day.calories) ;
          
            week_steps_total += day.steps;
            document.getElementById('average').text = prettyNumber(week_cal_total / index) +
                " ... " + prettyNumber(week_steps_total / index); 



            if (reduce(day_calories) >= CAL_GOAL) {
                flags.push('✅'); // emoji that are not supported on clockface will break all emojis

            } else {
                flags.push('⚪️');
            }

        });

        document.getElementById('flags').text = (flags.reverse().join(''));
    }

}


//--------------------------------------------------------------
// getMinuteHistory(done_cals)
//               gets the history but only the last minute
//               since the total_cals_for_day are always
//               one minute behind.
// side effects : renders lastminutecals caleta calbar & calorieTimeSpend
//--------------------------------------------------------------

function getMinuteHistory(done_cals) {
    const minRecords = minuteHistory.query({
        limit: 1
    }); // 


    var cals_left = CAL_GOAL - done_cals;

    if (cals_left < 0) { // this stop negative numbers from being rendered on clockface
        cals_left = 0;
    }

    minRecords.forEach((min, index) => {
        var flag = '';
        
        var real_burn = (min.calories-bmr_per_minute); 
      real_burn = real_burn-(calorie_correction_percentage*real_burn);
        if (real_burn < 0) {
            real_burn = 0.001;
        }
        var real_burn_org = real_burn;
        document.getElementById('lastMinuteCalories').text = real_burn.toFixed(1);
        
  
        var time_left = (cals_left / real_burn);
      time_left=prettyMinutes(time_left);
      if(real_burn<0.1){
          time_left='∞';
         }
      
      if(cals_left===0){
          time_left='DONE';
         }
        document.getElementById('calorieETA').text = (time_left) + flag;

        //the SDK cals are a minute behind to guesstimate down to the second

        done_cals = parseFloat(done_cals) + parseFloat(((real_burn_org) / 60) * global_seconds);
        document.getElementById('calorieBar').width = (done_cals / CAL_GOAL) * SCREEN_WIDTH;


        var cal_time_spent = done_cals / BASE_SPEED;
        if (cal_time_spent < 0) {
            cal_time_spent = 0;
        }
        document.getElementById('calorieTimeSpent').text = done_cals.toFixed(2); // render cals instead of etimated time.
                                                             //TODO rename element in css and html

    });
}

//--------------------------------------------------------------
// prettyNumber(x)
//              add commas to string of numbers
//--------------------------------------------------------------
function prettyNumber(x) {
    return x.toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

//---------------------------------------------------------------
//  prettyMinutes(minutes)
//---------------------------------------------------------------
function prettyMinutes(minutes) {

minutes=parseFloat(minutes);
    var seconds = minutes * 60; // minutes is float so you can get seconds.

    var pretty = new Date(seconds * 1000).toISOString().substr(11, 8)
    return pretty;
}
