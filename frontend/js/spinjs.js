const wheel = document.getElementById("wheel");
const spinBtn = document.getElementById("spin-btn");
const finalValue = document.getElementById("fVal");
const setValInput = document.getElementById("set-Val");
const setValueBtn = document.getElementById("setValueBtn");
const DltSpinVal = document.getElementById("DltSpinVal");
const BackendURL = 'http://localhost:5000';




document.addEventListener('DOMContentLoaded', function () {

  $("#loader").hide();
  // Start the timer
  startTimer();
  fetchSpinValue();
  LastTimeValueSpinned()
  if (localStorage.getItem("IsValid")) {

    $(".inputBox").show();
    $(".dltSave").show();
    $("#LogOutBtn").show();
    $("#userIconDiv").hide();

  } else {
    $(".inputBox").hide();
    $(".dltSave").hide();
    $("#LogOutBtn").hide();
    $("#userIconDiv").show();

  }




  setValueBtn.addEventListener("click", () => {
    const value = parseInt(setValInput.value, 10);
    if (isNaN(value) || value < 1 || value > 10) {
      Swal.fire({
        icon: "error",
        text: "Please enter a value between 1 and 10",
      });
    } else {

      const currentTime = new Date();
      let startHour = currentTime.getHours();
      let startMinutes = currentTime.getMinutes() < 30 ? 0 : 30;
      let endHour = startMinutes === 0 ? startHour : startHour + 1;
      let endMinutes = startMinutes === 0 ? 30 : 0;

      // Adjust end hour for the next day
      if (endHour === 24) endHour = 0;

      // Format the times in HH:MM AM/PM
      const formatTime = (hour, minutes) => {
        const period = hour >= 12 ? "PM" : "AM";
        hour = hour % 12 || 12; // Convert to 12-hour format
        minutes = minutes.toString().padStart(2, '0');
        return `${hour}:${minutes} ${period}`;
      };

      const interval = `${formatTime(startHour, startMinutes)} to ${formatTime(endHour, endMinutes)}`;



      setSpinValueToMongo(value, interval); // Save to MongoDB
      setValInput.value = "";
      Swal.fire({
        text: `Spin value ${value} set for this time interval`,
        icon: "success"
      });
    }
  });
});


const rotationValues = [
  { minDegree: 0, maxDegree: 35, value: 1 },
  { minDegree: 36, maxDegree: 71, value: 2 },
  { minDegree: 72, maxDegree: 107, value: 3 },
  { minDegree: 108, maxDegree: 143, value: 4 },
  { minDegree: 144, maxDegree: 179, value: 5 },
  { minDegree: 180, maxDegree: 215, value: 6 },
  { minDegree: 216, maxDegree: 251, value: 7 },
  { minDegree: 252, maxDegree: 287, value: 8 },
  { minDegree: 288, maxDegree: 323, value: 9 },
  { minDegree: 324, maxDegree: 359, value: 10 },
];


const data = [16, 16, 16, 16, 16, 16, 16, 16, 16, 16];


let pieColors = [
  "#8b35bc", "#b163da", "#8b35bc", "#b163da", "#8b35bc", "#b163da",
  "#8b35bc", "#b163da", "#8b35bc", "#b163da"
];


let myChart = new Chart(wheel, {
  plugins: [ChartDataLabels],
  type: "pie",
  data: {
    labels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    datasets: [
      {
        backgroundColor: pieColors,
        data: data,
      },
    ],
  },
  options: {
    responsive: true,
    animation: { duration: 0 },
    plugins: {
      tooltip: false,
      legend: { display: false },
      datalabels: {
        color: "#ffffff",
        formatter: (_, context) => context.chart.data.labels[context.dataIndex],
        font: { size: 24 },
      },
    },
  },
});


const updateWheelColor = (value) => {

  pieColors = [
    "#8b35bc", "#b163da", "#8b35bc", "#b163da", "#8b35bc", "#b163da",
    "#8b35bc", "#b163da", "#8b35bc", "#b163da"
  ];

  if (value) {

    const valueIndex = parseInt(value, 10) - 1; // Map 1-10 to index 0-9
    pieColors[valueIndex] = "#28a745"; // Change to green
  }
};


const valueGenerator = (angleValue) => {
  for (let i of rotationValues) {
    if (angleValue >= i.minDegree && angleValue <= i.maxDegree) {
      finalValue.innerHTML = `Last spinned Value is: ${i.value}`;
      spinBtn.disabled = false;

      let currentTime = new Date();
      let hours = currentTime.getHours();
      let minutes = currentTime.getMinutes().toString().padStart(2, '0'); // Ensure two digits

      // Determine AM/PM
      let period = hours >= 12 ? "PM" : "AM";

      // Convert hours to 12-hour format
      hours = hours % 12 || 12; // Convert 0 to 12 for midnight and use 12-hour format
      hours = hours.toString().padStart(2, '0'); // Ensure two digits if needed

      // Format as HH:MM AM/PM
      let interval = `${hours}:${minutes} ${period}`;


      updateWheelColor(i.value);
      SaveSpinVal(i.value, interval)



      myChart.data.datasets[0].backgroundColor = pieColors;
      myChart.update();

      break;
    }
  }
};





async function fetchSpinValue() {
  try {
    $("#loader").show();
    const response = await fetch(`/api/spinValue`);
    const spinValueList = await response.json();
    $("#loader").hide();
    console.log(spinValueList)
    if (spinValueList.length > 0) {
      BindIntoTable(spinValueList);
    }
  } catch (error) {
    console.error("Error fetching spin value:", error);
  }
}


async function setSpinValueToMongo(value, interval) {
  try {
    $("#loader").show();
    const response = await fetch(`/api/spinValueUserSet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, interval })
    });
    $("#loader").hide();
    const data = await response.json();
    console.log("Saved spin value:", data);
  } catch (error) {
    console.error("Error saving spin value:", error);
  }
}


const runTimer = (savedValue) => {
  spinBtn.disabled = true;
  let count = 0;
  let resultValue = 101;

  if (savedValue != 0) {

    resultValue = parseInt(savedValue, 10);


    const minDegree = (resultValue - 1) * 36; // Start of the segment
    const maxDegree = resultValue * 36 - 1; // End of the segment
    randomDegree = Math.floor((minDegree + maxDegree) / 2); // Exact center of the range
  } else {

    randomDegree = Math.floor(Math.random() * 360);
  }


  const targetRotation = 360 * 15 + randomDegree; // 15 full rotations + target value

  let currentRotation = 0; // Track the current rotation
  let spinSpeed = 25; // Initial spin speed, you can start with a higher speed
  let slowingDown = false; // Flag to indicate when to slow down

  const rotationInterval = window.setInterval(() => {
    if (!slowingDown) {

      currentRotation += spinSpeed;
    } else {

      currentRotation += spinSpeed;
      spinSpeed *= 0.98; // Gradually reduce speed by 2% at each step
      if (spinSpeed < 1) {
        spinSpeed = 1; // Prevent the speed from going too low (we stop at speed 1)
      }
    }


    if (currentRotation >= targetRotation - 1080) {
      slowingDown = true;
    }

    if (currentRotation >= targetRotation) {
      clearInterval(rotationInterval); // Stop the interval
      const finalRotation = currentRotation % 360; // Normalize to 0-359
      valueGenerator(finalRotation); // Determine the final value
      count = 0; // Reset count
      resultValue = 101; // Reset result value


      setTimeout(() => {

        startTimer();
      }, 2500);
    }

    myChart.options.rotation = currentRotation % 360; // Update chart rotation
    myChart.update(); // Re-render the chart
  }, 10); // Interval for smooth animation
};



function startTimer() {
  const timerDisplay = document.getElementById("timer-display");
  let lastSpinCallTime = null; // To track when `fetchSpinValueFromApi` was last called


  pieColors = [
    "#8b35bc", "#b163da", "#8b35bc", "#b163da", "#8b35bc", "#b163da",
    "#8b35bc", "#b163da", "#8b35bc", "#b163da"
  ];
  myChart.data.datasets[0].backgroundColor = pieColors;
  function updateDisplay() {

    const currentTime = new Date();


    let hours = currentTime.getHours();
    let minutes = currentTime.getMinutes();
    let seconds = currentTime.getSeconds();


    let period = hours >= 12 ? "PM" : "AM";


    hours = hours % 12; // Convert 24-hour format to 12-hour format
    hours = hours ? hours : 12; // Handle the case when the hour is 0 (midnight or noon)


    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;


    timerDisplay.textContent = `${hours} : ${minutes} : ${seconds} ${period}`;
  }


  function runAtInterval() {
    const currentTime = new Date();
    const minutes = currentTime.getMinutes();
    const targetTimes = [0,  30]; // Define target times
  
    if (targetTimes.includes(minutes)) {
      console.log(`API called at ${currentTime.toLocaleTimeString()}`);
      // Call the API
      fetchSpinValueFromApi();
    }
  }
  
  function alignToRealTime() {
    const now = new Date();
    const secondsUntilNextMinute = 60 - now.getSeconds(); // Calculate seconds to align with the next minute
  
    // Align to the next minute
    setTimeout(() => {
      setInterval(runAtInterval, 60000); // Start interval after alignment
      // runAtInterval(); // Call immediately to cover the current interval
    }, secondsUntilNextMinute * 1000);
  }
  
  // Start the process
  alignToRealTime();
   

  setInterval(updateDisplay, 1000);


  updateDisplay(); // Show the current time as soon as the timer starts
}



DltSpinVal.addEventListener('click', async () => {

  const currentTime = new Date();
  const minutes = currentTime.getMinutes();


  currentTime.setMinutes(minutes < 30 ? 0 : 30);
  currentTime.setSeconds(0);
  currentTime.setMilliseconds(0);

  const intervalStart = new Date(currentTime);
  const intervalEnd = new Date(currentTime);

  intervalEnd.setMinutes(intervalEnd.getMinutes() + 30); // Add 30 minutes for the end time


  const intervalStartIso = intervalStart.toISOString();
  const intervalEndIso = intervalEnd.toISOString();


  try {
    const response = await fetch(`/api/deleteSpinValue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startTimestamp: intervalStartIso,
        endTimestamp: intervalEndIso
      })
    });

    const data = await response.json();
    if (data.success) {
      Swal.fire({
        text: "Spin value records within the time interval have been successfully deleted.",
        icon: "success"
      });
    } else {
      alert("No records found within the specified time interval.");

      Swal.fire({
        text: "No records found within the specified time interval.",
        icon: "warning"
      });
    }
  } catch (error) {
    console.error("Error deleting spin records:", error);
    Swal.fire({
      icon: "error",
      text: "An error occurred while deleting records.",
    });
  }


});


async function fetchSpinValueFromApi() {
  try {
    $("#loader").show();
    const response = await fetch(`/api/spinValueUserSet`);
    const spinValues = await response.json();
    $("#loader").hide();
    if (spinValues && spinValues.length > 0) {

      const latestSpin = spinValues[0]; // The most recent spin value
      const spinValue = latestSpin.value;
      console.log(spinValue)
      runTimer(spinValue);
    } else {
      runTimer(0);
    }
  } catch (error) {
    console.error('Error fetching spin value:', error);
    runTimer(0);
    Swal.fire({
      icon: "error",
      text: "Error fetching spin value",
    });

  }
}

async function SaveSpinVal(value, interval) {
  try {
    $("#loader").show();
    const response = await fetch(`/api/spinValue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, interval })
    });
    $("#loader").hide();
    var result = await response.json();

    if (result.statuscode == 200) {
      fetchSpinValue();
    }

  } catch (error) {
    console.error('Error fetching spin value:', error);
    Swal.fire({
      icon: "error",
      text: "Error fetching spin value",
    });
  }
}

const CheckLogin = async () => {
  var userID = $("#email").val().trim();
  var Password = $("#password").val().trim();

  if (userID && Password) {
    try {
      $("#loader").show();
      // Include UserID and Password in the query string
      var response = await fetch(`/api/ValidUsers?UserID=${encodeURIComponent(userID)}&Password=${encodeURIComponent(Password)}`);
      var res_Json = await response.json();
      $("#loader").hide();
      if (res_Json.success) {
        Swal.fire({
          icon: "success",
          text: "User logged in successfully.",
        });
        var myModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('logInModal'));
        myModal.hide();
        localStorage.setItem("IsValid", "1");
        $(".inputBox").show();
        $(".dltSave").show();
        $("#userIconDiv").hide();
        $("#LogOutBtn").show();

      } else {
        Swal.fire({
          icon: "error",
          text: res_Json.message || "Invalid login credentials.",
        });
      }
    } catch (error) {
      console.error("Error logging in:", error);
      Swal.fire({
        icon: "error",
        text: "An error occurred while attempting to log in. Please try again later.",
      });
    }
  } else {
    Swal.fire({
      icon: "error",
      text: "Kindly enter your User ID and Password to log in.",
    });
  }
};

LogOutBtn.addEventListener("click", () => {
  localStorage.clear();
  $(".inputBox").hide();
  $(".dltSave").hide();
  $("#userIconDiv").show();
  $("#dltSave").hide();
  $("#LogOutBtn").hide();



  Swal.fire({
    icon: "success",
    text: "LogOut Successfully.",
  });
})

const BindIntoTable = (SpiValList) => {
  var dhtml = "";
  const currentDate = new Date().getDate(); // Get today's date (day of the month)

  // Filter data for the current day only
  var filteredData = SpiValList.filter(val => {
    const recordDate = new Date(val.timestamp).getDate();
    return recordDate === currentDate;
  });
  var main_tbl = $("#main_tbl");
  main_tbl.empty();
  filteredData.forEach(element => {
    dhtml += "<tr>"
    dhtml += `<td>${element.interval}</td>`
    dhtml += `<td>${element.value}</td>`
    dhtml += "</tr>"

  });

  main_tbl.append(dhtml);

}

const LastTimeValueSpinned = async () => {
  try {
    $("#loader").show();
    var response = await fetch(`api/LastTimeValueSpinned`);
    var res_Json = await response.json();
    console.log(res_Json)
    $("#loader").hide();
    UpdateLastTime(res_Json);

  } catch (error) {
    console.log("LastTimeValueSpinned: " + error)
  }

}

const UpdateLastTime = (LastTimeValueSpinned) => {

  finalValue.innerHTML = `Last spinned Value is: ${LastTimeValueSpinned.value}`;

  updateWheelColor(LastTimeValueSpinned.value);
  myChart.data.datasets[0].backgroundColor = pieColors;
  myChart.update();
}

