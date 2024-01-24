// import * as AdbDaemonWebUsbDeviceManager from "../node_modules/@yume-chan/adb";
import * as fastboot from "../node_modules/android-fastboot/dist/fastboot.mjs";

var serial = {};

(function() {
  'use strict';

  serial.requestPort = function() {
    const filters = [
      { classCode: 0xff, subclassCode: 0x42, protocolCode: 0x03 }, //fastboot protocol
      { classCode: 0xff, subclassCode: 0x42, protocolCode: 0x01 }, //adb protocol
      // { 'vendorId': 0x18d1, 'productId': 0xd00d },//chiron pro
      // { 'vendorId': 0x05c6, 'productId': 0x90b8 },//triton
      // { 'vendorId': 0x18d1, 'productId': 0x4ee7 },//phaeton
    ];
    return navigator.usb.requestDevice({ 'filters': filters }).then(
      device => new serial.Port(device)
    );
  }

  serial.Port = function(device) {
    this.device_ = device;
  };

  serial.Port.prototype.connect = function() {
    let readLoop = () => {
      const {
        endpointNumber
      } = this.device_.configuration.interfaces[0].alternate.endpoints[0]
      this.device_.transferIn(endpointNumber, 64).then(result => {
        this.onReceive(result.data);
        readLoop();
      }, error => {
        this.onReceiveError(error);
      });
    };
    return this.device_.open()
      .then(() => {
        if (this.device_.configuration === null) {
          return this.device_.selectConfiguration(1);
        }
      })
      .then(() => this.device_.claimInterface(0))
      .then(() => {
        readLoop();
    });
  };

  serial.Port.prototype.disconnect = function() {
    return this.device_.close();
  };
})();

function showDevice(serial, proName, ADBorFastboot) {
  const myNode = document.querySelector("#paired");
  while(myNode.firstChild) {
    myNode.removeChild(myNode.lastChild);
  }

  let h5 = document.createElement("h5");
  let mode = ADBorFastboot?" (ADB)":" (Fastboot)";
  h5.appendChild(document.createTextNode(proName + mode));
  myNode.appendChild(h5);
  let p = document.createElement("p");
  p.appendChild(document.createTextNode("Serial No: " + serial));
  myNode.appendChild(p);
}


let device = new fastboot.FastbootDevice();
window.device = device;
fastboot.setDebugLevel(2);

async function connect(ADB_mode) {
  if(!ADB_mode) {
    await device._validateAndConnectDevice();
    let product = await device.getVariable("product");
    let serial = await device.getVariable("serialno");
    let status = `Connect to ${product} (serial: ${serial})`;
    console.log(status);
  } else {
    adb = await webusb.connectAdb("host::", () => {
      //console.log(webusb.device.productName);
    });
    if(adb.transport.device.opened == true) {
      let shell = await adb.shell("getprop ro.product.name");
      let get = await shell.receive();
      Uint8toStr(get.data);
      document.querySelector("#connect").style = "height: 15%; width: 46%; top: unset; bottom: 2%; left:3%; transform: translate(0%, 0%); visibility: hidden;";
      const open = document.querySelectorAll(".disabled");
      open.forEach((x) => {
        // console.log(x);
        x.className="notdisabled";
      });
      document.querySelector("#readmeLink").addEventListener("click", function() { buttonLink("readmeLink","readme");});
      document.querySelector("#DEVLink").addEventListener("click", function() { buttonLink("DEVLink", "DEVinfo"); getDEVinfo();});
      document.querySelector("#SCRLink").addEventListener("click", function() { buttonLink("SCRLink", "SCRcap"); screenShot();});
      document.querySelector("#SCRshot").addEventListener("click", function() { screenShot();});
      document.querySelector("#Flash").addEventListener("click", function() { 
        buttonLink("Flash", "Flash_IMG");
        document.querySelector("#download_page").style = "visibility: hidden";
        Flash_IMG(".");});
      //SCRshot
    } 
  }
}

function Uint8toStr(filedata) {
  let dataString = "";
  for (let i = 0; i < filedata.byteLength; i++) {
    dataString += String.fromCharCode(filedata.getUint8(i));
  }
  console.log(dataString);
  return dataString;
}

var ADB_mode;
var adb;
var webusb;

window.onload = _ => {
  document.querySelector("#connect").style = "visibility: hidden";
  document.querySelector("#pair").onclick = async function() {
    if(webusb != null) {
      await webusb.close();
      window.location.reload();
    }
    webusb = await Adb.open("WebUSB");
    console.log(webusb.device);
    if(webusb.isAdb()) {
      ADB_mode = true;
      adb = await webusb.connectAdb("host::", () => {
        console.log(webusb.device.productName);
      });
      let shell = await adb.shell("getprop ro.product.name");
      let get = await shell.receive();
      let proName = Uint8toStr(get.data);
      showDevice(webusb.device.serialNumber, proName, true);
    } else if (webusb.isFastboot()) {
      device.device = webusb.device;
      await device._validateAndConnectDevice();
      ADB_mode = false;
      showDevice(webusb.device.serialNumber, "Android", false);
      await webusb.close();
    }
    
    document.querySelector("#mask").style = "visibility: hidden";
    document.querySelector("#pair").style = "height: 15%; width: 46%; top: unset; bottom: 2%; left:52%; transform: translate(0%, 0%);";
    document.querySelector("#connect").style = "height: 15%; width: 46%; top: unset; bottom: 2%; left:3%; transform: translate(0%, 0%); visibility: initial;";
    document.querySelector("#connect").addEventListener("click", function() { connect(ADB_mode);});
  }
}

function buttonLink(buttonName, idName) {
  const btnDisable = document.querySelectorAll(".active");
  btnDisable.forEach((x) => {
    x.className="notdisabled";
    x.style="";
  });
  const close = document.querySelectorAll(".index");
  close.forEach((x) => {
    x.style.display="none";
  });
  var open = document.getElementById(idName);
  open.style.display="block";
  var btnActive = document.getElementById(buttonName);
  btnActive.className = "active";
  btnActive.style = "pointer-events: none;";
}

async function getDEVinfo() {
  let shell = await adb.shell("getprop ro.product.name");
  let get = await shell.receive();
  let proName = Uint8toStr(get.data);
  shell = await adb.shell("getprop ro.product.model");
  get = await shell.receive();
  let modelName = Uint8toStr(get.data);
  shell = await adb.shell("getprop ro.product.device");
  get = await shell.receive();
  let deviceName = Uint8toStr(get.data);
  shell = await adb.shell("getprop ro.build.version.release");
  get = await shell.receive();
  let versionName = Uint8toStr(get.data);
  shell = await adb.shell("getprop ro.build.fingerprint");
  get = await shell.receive();
  let fingerprint = Uint8toStr(get.data);
  shell = await adb.shell("getprop ro.build.type");
  get = await shell.receive();
  let build = Uint8toStr(get.data);
  document.getElementById("name").innerHTML = proName;
  document.getElementById("model").innerHTML = modelName;
  document.getElementById("device").innerHTML = deviceName;
  document.getElementById("version").innerHTML = versionName;
  document.getElementById("finger").innerHTML = fingerprint;
  document.getElementById("build").innerHTML = build;
}

var wait = (ms) => {
  const start = Date.now();
  console.log("Waiting for " + ms + "ms!")
  let now = start;
  while(now - start < ms) {
    now = Date.now();
  }
}

async function screenShot() {
  console.log("ScreenShot!!!");
  document.querySelector("#screen_image").src = "";
  console.log(await adb.shell("screencap -p /sdcard/1.png"));
  wait(700);
  let sync = await adb.sync();
  let content = await sync.pull("/sdcard/1.png");
  console.log(await sync.quit());
  let a = document.getElementById("DWPIC");
  a.href = await URL.createObjectURL(new Blob([content]));
  a.download = "screenshot.png";
  //a.click();
  // document.getElementById("screen_image").appendChild(a);
  document.querySelector("#screen_image").src = a.href;
}

async function Flash_IMG(perm) {
  let fileSource;
  const forData = new FormData();
  forData.append("action", perm);
  fetch("../php/data.php", {
    method: 'POST',
    body: forData,
  })
  .then(response => {
    response.json().then((result) => {
      fileSource = Object.values(result);
      fileBTN(fileSource, perm);
    });
  }).catch(response => {
    console.error(response);
  });
}

function Stack() {
  let items = [];
  this.push = (element =>{
    items.push(element);
  });
  this.pop = () => {
    items.pop();
  };
  this.peek = () => {
    return items[items.length - 1];
  };
  this.empty = () => {
    return items.length === 0;
  };
  this.size = () => {
    return items.length;
  };
  this.clear = () => {
    items = [];
  };
}

var dirP = new Stack();
var timeID;

function fileBTN(fileSource, perm) {
  // console.log(perm);
  // console.log(dirP.peek());
  // console.log(dirP.size());
  let insert = document.getElementById("Flash_IMG_index");
  let dir_link = document.getElementById("DIR_LINK");
  while(insert.firstChild) {
    insert.removeChild(insert.lastChild);
  }
  if(dirP.size() == 0) {
    if(perm.indexOf('..') <= -1) {
      let a1 = document.createElement("a");
      a1.textContent = "/home";
      a1.addEventListener("click", function() { 
        while(dir_link.lastChild) {
          dir_link.removeChild(dir_link.lastChild);
        }
        perm = ".";
        dirP.clear();
        Flash_IMG(perm);
      });
      dir_link.appendChild(a1);
    }
  } else {
    let a = document.createElement("a");
    a.classList.add("filelink");
    a.textContent="上一頁";
    let div = document.createElement("div");
    div.classList.add("files", "folder");
    div.appendChild(a);
    let a1 = document.createElement("a");
    a1.textContent = "/" + dirP.peek();
    a1.addEventListener("click", function() { 
      // console.log(perm);
      while(a1.textContent != dir_link.lastChild.textContent) {
        dir_link.removeChild(dir_link.lastChild);
        perm = perm.replace("/" + dirP.peek(), "");
        dirP.pop();
      }
      dir_link.removeChild(dir_link.lastChild);
      Flash_IMG(perm);
    });
    dir_link.appendChild(a1);
    div.addEventListener("click", function() {
      dir_link.removeChild(dir_link.lastChild);
      dir_link.removeChild(dir_link.lastChild);
      console.log(perm);
      console.log(dirP.peek());
      perm = perm.replace("/" + dirP.peek(), "");
      console.log(perm);
      dirP.pop();
      Flash_IMG(perm);
    });
    insert.appendChild(div);
  }
  fileSource = fileSource.sort((a, b) => {
    if(a.name < b.name) {
      return -1;
    }
  });
  let keys = Object.keys(fileSource);
  keys.forEach(key => {
    // console.log(fileSource[key]);
    // console.log(fileSource[key].name);
    // console.log(fileSource[key].type);
    // console.log(fileSource[key].perm);
    if (fileSource[key].type == "file") {
      let a = document.createElement("a");
      a.classList.add("filelink");
      a.textContent = fileSource[key].name;
      let div = document.createElement("div");
      //zip file can show up
      if (a.textContent.indexOf('zip') > -1 && 
         (a.textContent.length - a.textContent.indexOf('zip') == 3)) {
        div.classList.add("files", "folder_zip");
        div.appendChild(a);
        div.addEventListener("click", function() {
          downloadpage(perm, fileSource[key].size, fileSource[key].name, (a.textContent.indexOf('zip') > -1) ? "folder_zip" : "file");
        });
        insert.appendChild(div);
      }
    } else if (fileSource[key].type == "dir") {
      let a = document.createElement("a");
      a.classList.add("filelink");
      a.textContent = fileSource[key].name;
      let div = document.createElement("div");
      div.classList.add("files", "folder");
      div.appendChild(a);
      div.addEventListener("click", function() {
        dirP.push(a.textContent);
        Flash_IMG(perm + "/" + fileSource[key].name);
      });
      insert.appendChild(div);
    } 
  });
}

async function downloadFTP(loc ,filename) {
  console.log(loc);
  const forData = new FormData();
  forData.append("downLoad", loc);
  await fetch("../php/data.php", {
    method: 'POST',
    body: forData,
  })
  .then(response => {
    response.text().then((result) => {
      document.querySelector("#DLpertcentage").style.width = "100%";
      document.querySelector("#DLpertcentage").style.backgroundColor = "lawngreen";
      document.querySelector("#OK").innerHTML = "unzip...";
      if(result === "0") { //download success!!!
        return unzip(filename);
      }
    });
  }).catch(response => {
    console.error(response);
    return false;
  });
}

async function unzip(perm) {
  console.log(perm);
  const forData = new FormData();
  forData.append("unzip", perm);
  fetch("../php/data.php", {
    method: 'POST',
    body: forData,
  })
  .then(response => {
    response.text().then((result) => {
      console.log("unzip successfil!!!");
      //console.log(result);
      flash(result);
      return true;
    });
  }).catch(response => {
    console.error(response);
  });
}

async function flash(perm) {
  let okBTN = document.querySelector("#OK");
  //okBTN.replaceWith(okBTN.cloneNode(true));
  if(adb.transport.device.opened == true) {
    await adb.shell("reboot bootloader");
    wait(1000);
    await webusb.close();
    wait(10000);
    document.querySelector("#OK").style = "";
    document.querySelector("#OK").innerHTML = "FLASH!";
    okBTN.addEventListener("click", async function() {
      webusb = await Adb.open("WebUSB");
      device.device = webusb.device;
      await device._validateAndConnectDevice();
      let product = await device.getVariable("product");
      let serial = await device.getVariable("serialno");
      let status = `Connect to ${product} (serial: ${serial})`;
      console.log(status); // //"flash sbl1 " + perm + "sbl1.mbn"
      console.log(window.location.href);
      console.log(await device.runCommand("erase:oem"));
      await device.runCommand("reboot");
    });
  }
}

function getfileStats(url, _Size) {
  _Size = parseInt(_Size);
  let fileBlob;
  fetch(url).then((res) => {
    fileBlob = res.blob();
    return fileBlob;
  }).then((fileBlob) => {
    let _Width = fileBlob.size / _Size * 100;
    _Width = Math.round(_Width);
    _Width = String(_Width);
    document.querySelector("#DLpertcentage").style.width = _Width + "%";
    if(fileBlob.size >= _Size) {
      console.log("kill timeout");
      clearInterval(timeID);
    }
  });
}

function downloadpage(perm, filesize, filename, filetype) {
  let DP = document.querySelector("#download_page");
  let DPI = document.querySelector("#download_page_index");

  let DLline = document.createElement("div");
  DLline.classList.add("DLline");
  DLline.appendChild(document.createElement("div"));
  DLline.lastElementChild.id = "DLpertcentage";
  DPI.appendChild(DLline);
  DPI.appendChild(document.createElement("div"));
  let DPI_BTN = DPI.lastElementChild;
  DPI_BTN.classList.add("btn_group");
  let p = document.createElement("p");
  let okBTN = document.createElement("a");
  okBTN.id = "OK";
  okBTN.classList.add("btn-wave", "btn-resize2");
  okBTN.innerHTML = "Download&Flash";
  let cancelBTN = document.createElement("a");
  cancelBTN.id = "cancel";
  cancelBTN.classList.add("btn-wave", "btn-resize2");
  cancelBTN.innerHTML = "Cancel";
  DPI_BTN.appendChild(okBTN);
  DPI_BTN.appendChild(cancelBTN);
  p.innerHTML = filename;
  DP.style = "visibility: visible";
  DPI.classList.add(filetype);
  DPI.appendChild(p);
  cancelBTN.addEventListener("click", function() {
    DPI.classList.remove(filetype);
    DP.style = "visibility: hidden";
    while(DPI.lastChild)
      DPI.removeChild(DPI.lastChild);
  });
  okBTN.addEventListener("click", function() {
    console.log([filename, filesize]);
    okBTN.style = "pointer-events: none;";
    okBTN.innerHTML = "Downloading...";
    downloadFTP(perm + "/" + filename ,filename);
    timeID = setInterval(() => {
      getfileStats(window.location.href + "image_buffer/" + filename, filesize);
    }, 4000);
  }, {once: true});
}