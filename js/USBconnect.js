// import * as AdbDaemonWebUsbDeviceManager from "../node_modules/@yume-chan/adb";
import * as fastboot from "./fastboot.mjs";

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

var wait = (ms) => {
  const start = Date.now();
  console.log("Waiting for " + ms + "ms!")
  let now = start;
  while(now - start < ms) {
    now = Date.now();
  }
}

var device = new fastboot.FastbootDevice();
window.device = device;
fastboot.setDebugLevel(1);
var AOS = 9; // default set to AOS9
var ADB_mode;
var adb;
var webusb;
var serialNumber_backup;
var check_proName = "";
var can_Download = true;

//Show basic device info on MainPage left side.
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

//Establish left side button to their correspond function.
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

//Making a connection to deivice, either ADB or Fastboot mode.
async function connect(ADB_mode) {
  document.querySelector("#pair").style = "visibility: hidden";
  if(!ADB_mode) {
    let product = await device.getVariable("product");
    let serial = await device.getVariable("serialno");
    let status = `Connect to ${product} (serial: ${serial})`;
    console.log(status);
    let part = await device.getVariable("partition-type:super");//AOS10?
    if(part === null){//AOS9
      console.log("AOS9");
    } else { //AOS10 or 13
      part = await device.getVariable("partition-type:devcfg_a");
      if(part === null){//AOS10
        console.log("AOS10");
        AOS = 10;
      } else {
        console.log("AOS13");
        AOS = 13;
      }
    }
    const open = document.querySelectorAll("#Flash");
      open.forEach((x) => {
        x.className="notdisabled";
      });
    document.querySelector("#Flash").addEventListener("click", function() { 
      buttonLink("Flash", "Flash_IMG");
      document.querySelector("#download_page").style = "visibility: hidden";
      fetch("https://10.88.25.179/ftp/make_creator.sh" ,{ method: 'HEAD', rejectUnauthorized: false })
      .catch((e) => {
        console.log(e);
        alert("會開一個新分頁，請幫我確認能不能正常瀏覽，如無法正常瀏覽，請按進階，然後繼續！");
        alert("確認能正常瀏覽後，就直接關掉該分頁！");
        window.open("https://10.88.25.179/ftp", "_blank")
        });
      Flash_IMG("");
      });
  } else if(adb.transport.device.opened == true) {
    let shell = await adb.shell("getprop ro.product.name");
    let get = await shell.receive();
    Uint8toStr(get.data);
    wait(75);
    shell = await adb.shell("getprop ro.build.version.release");
    wait(75);
    get = await shell.receive();
    AOS = Number(Uint8toStr(get.data));
    const open = document.querySelectorAll(".disabled");
    open.forEach((x) => {
      x.className="notdisabled";
    });
    document.querySelector("#readmeLink").addEventListener("click", function() { buttonLink("readmeLink","readme");});
    document.querySelector("#DEVLink").addEventListener("click", function() { buttonLink("DEVLink", "DEVinfo"); getDEVinfo();});
    document.querySelector("#SCRLink").addEventListener("click", function() { buttonLink("SCRLink", "SCRcap"); screenShot();});
    document.querySelector("#SCRshot").addEventListener("click", function() { screenShot();});
    document.querySelector("#Flash").addEventListener("click", function() { 
      buttonLink("Flash", "Flash_IMG");
      document.querySelector("#download_page").style = "visibility: hidden";
      Flash_IMG("");
    });
  }
}

function Uint8toStr(filedata) {
  let dataString = "";
  for (let i = 0; i < filedata.byteLength; i++) {
    dataString += String.fromCharCode(filedata.getUint8(i));
  }
  // console.log(dataString);
  return dataString;
}

window.onload = _ => {
  //Check Chromium-base or not.
  let chrome_check = window.navigator.userAgent.indexOf("Chrome") > -1;
  if(chrome_check){
    fetch("https://10.88.25.179/ftp/make_creator.sh" ,{ method: 'HEAD', rejectUnauthorized: false })
      .catch((e) => {
        console.log(e);
        alert("會開一個新分頁，請幫我確認能不能正常瀏覽，如無法正常瀏覽，請按進階，然後繼續！");
        alert("確認能正常瀏覽後，就直接關掉該分頁！");
        window.open("https://10.88.25.179/ftp", "_blank")
    });
    document.querySelector("#pair").onclick = async function() {
      if(webusb != null) {
        window.location.reload();
      }
      try{
        webusb = await Adb.open("WebUSB");
        if(webusb.isAdb()) {
          ADB_mode = true;
          adb = await webusb.connectAdb("host::", () => {
            console.log(webusb.device.productName);
          });
          let shell = await adb.shell("getprop ro.product.name");
          let get = await shell.receive();
          let proName = Uint8toStr(get.data);
          check_proName = proName.slice(0, proName.length - 1);
          showDevice(webusb.device.serialNumber, proName, true);
        } else if (webusb.isFastboot()) {
          device.device = webusb.device;
          await device._validateAndConnectDevice();
          ADB_mode = false;
          showDevice(webusb.device.serialNumber, "Android", false);
        }
        serialNumber_backup = webusb.device.serialNumber;
        
        document.querySelector("#mask").style = "visibility: hidden";
        if(webusb.isAdb() || webusb.isFastboot()) {
          connect(ADB_mode);
        }
      }
      catch(e){
        if(e.name == "NotFoundError"){
          alert("No device selected!");
        } else if(e.name == "NetworkError"){
          alert("Some thing wrong, please try again!");
          alert("Try use this command on terminal -> 'adb kill-server'");
        } else {
          alert(e);
          window.location.reload();
        }
      }
    }
  } else {
    alert("'Chromium-base' browser required!");
    document.querySelector("#pair").lastChild.innerHTML = "不可用";
  }
}

//When device is under ADB mode, we can use shell command to get some infomation we needed.
async function getDEVinfo() {
  let shell = await adb.shell("getprop ro.product.name");
  wait(75);
  let get = await shell.receive();
  let proName = Uint8toStr(get.data);
  shell = await adb.shell("getprop ro.product.model");
  wait(75);
  get = await shell.receive();
  let modelName = Uint8toStr(get.data);
  shell = await adb.shell("getprop ro.product.device");
  wait(75);
  get = await shell.receive();
  let deviceName = Uint8toStr(get.data);
  shell = await adb.shell("getprop ro.build.version.release");
  wait(75);
  get = await shell.receive();
  let versionName = Uint8toStr(get.data);
  shell = await adb.shell("getprop ro.build.fingerprint");
  wait(75);
  get = await shell.receive();
  let fingerprint = Uint8toStr(get.data);
  shell = await adb.shell("getprop ro.build.type");
  wait(75);
  get = await shell.receive();
  let build = Uint8toStr(get.data);//
  document.getElementById("name").innerHTML = proName;
  document.getElementById("model").innerHTML = modelName;
  document.getElementById("device").innerHTML = deviceName;
  document.getElementById("version").innerHTML = versionName;
  document.getElementById("finger").innerHTML = fingerprint;
  document.getElementById("build").innerHTML = build;
}

//Screen shot picture get, but AOS 13 cannot use(wait for fix).
async function screenShot() {
  console.log("ScreenShot!!!");
  document.querySelector("#screen_image").src = "";
  console.log(await adb.shell("screencap -p /sdcard/1.png"));
  wait(1200);
  let sync = await adb.sync();
  wait(300);
  let content = await sync.pull("/sdcard/1.png");
  console.log(await sync.quit());
  let a = document.getElementById("DWPIC");
  wait(300);
  a.href = await URL.createObjectURL(new Blob([content], {type: 'image/png'}));
  a.download = "screenshot.png";
  document.querySelector("#screen_image").src = a.href;
}

async function Flash_IMG(perm) {
  fetch("https://10.88.25.179/ftp/make_creator.sh" ,{ method: 'HEAD', rejectUnauthorized: false })
  .catch((e) => {
    console.log(e);
    alert("會開一個新分頁，請幫我確認能不能正常瀏覽，如無法正常瀏覽，請按進階，然後繼續！");
    alert("確認能正常瀏覽後，就直接關掉該分頁！");
    window.open("https://10.88.25.179/ftp", "_blank")
  });
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


//Direct download image by key in image address.
function directDownload(){
  let DW_IMG_btn = document.getElementById("DW_IMG");
  DW_IMG_btn.addEventListener("click", async function() {
    let DW_PATH = document.getElementById("download_path").value;
    console.log(DW_PATH);
    if(DW_PATH.includes("https://10.88.25.179/ftp") || DW_PATH[0] != "/"){
      alert("路徑錯誤(e.g. /Project_Release/chiron_pro_9.0/BaseImage/R26g_B6350_userdebug/R26g.4.6350.1.2.20210127.zip)");
      document.getElementById("download_path").value = "";
      return;
    }
    let passfile = await fetch("https://10.88.25.179/ftp" + DW_PATH ,{ method: 'HEAD', rejectUnauthorized: false });
    console.log(check_proName);
    console.log(DW_PATH.includes(check_proName));
    if(DW_PATH.length == 0){
      alert("No path input!!!");
    } else {
      if(DW_PATH.includes(".zip") && (DW_PATH.includes(check_proName) || check_proName=="") && passfile.status == 200){
        if(check_proName==""){
          alert("在'FASTBOOT' mode底下，直接輸入網址下載是一件很危險的事情，請確定知道你在做什麼！");
        }
        DW_PATH = DW_PATH.split("/");
        console.log(DW_PATH);
        let perm = "";
        for(let i = 0; i < DW_PATH.length - 1; i++){
          perm += DW_PATH[i] + "/";
        }
        console.log(perm);
        downloadpage(perm, Number(passfile.headers.get('Content-Length')), DW_PATH[DW_PATH.length - 1], "folder_zip");
      } else {
        alert("路徑錯誤，檔案不存在，或選錯project！");
      }
      document.getElementById("download_path").value = "";
    }
  });
}


//Flash image page ,which can select image you wanna download!
//Or ,key in image address directly.
function fileBTN(fileSource, perm) {
  directDownload(); //directDownload block preparing!

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
      while(a1.textContent != dir_link.lastChild.textContent) {
        dir_link.removeChild(dir_link.lastChild);
        perm = perm.replace("/" + dirP.peek(), "");
        console.log("Go to " + perm);
        dirP.pop();
      }
      dir_link.removeChild(dir_link.lastChild);
      Flash_IMG(perm);
    });
    dir_link.appendChild(a1);
    div.addEventListener("click", function() {
      dir_link.removeChild(dir_link.lastChild);
      dir_link.removeChild(dir_link.lastChild);
      perm = perm.replace("/" + dirP.peek(), "");
      console.log("Go to " + perm);
      dirP.pop();
      Flash_IMG(perm);
    });
    insert.appendChild(div);
  }
  //file name sorting
  fileSource = fileSource.sort((a, b) => {
    if(a.name < b.name) {
      return -1;
    }
  });

  //file, dir buttin make
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
          downloadpage(perm + "/", fileSource[key].size, fileSource[key].name, (a.textContent.indexOf('zip') > -1) ? "folder_zip" : "file");
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
        console.log("Go to " + a.textContent);
        dirP.push(a.textContent);
        Flash_IMG(perm + "/" + fileSource[key].name);
      });
      insert.appendChild(div);
    } 
  });
}


//File download by many block because it can reduce the memory cost.
//And save it into blob file type
async function downloadFTP(loc ,filename) {
  const file_Loc = "//10.88.25.179/ftp" + loc;
  let okBTN = document.querySelector("#OK");
  let passfile = await fetch(file_Loc ,{ method: 'HEAD', rejectUnauthorized: false })
  .catch((e) => {
    console.log(e);
    document.querySelector("#DLpertcentage").style.width = "100%";
    document.querySelector("#DLpertcentage").style.backgroundColor = "red";
    okBTN.innerHTML = "ERROR";
    console.log("Download is interrupt!!!");
    return;
  });;
  if(passfile.status != 200){
    alert("Fetch ERROR!!!");
    console.log("Download is interrupt!!!");
    okBTN.style = "padding: 30px 10px;";
    document.querySelector("#DLpertcentage").style.width = "100%";
    document.querySelector("#DLpertcentage").style.backgroundColor = "red";
    okBTN.innerHTML = "ERROR";
    console.log("Download is interrupt!!!");
    return;
  }
  const contentLength = Number(passfile.headers.get('Content-Length'));
  let fileStream = [];
  const CHUNK_SIZE = 1024*1024*10;
  let offset = 0;
  while(offset < contentLength && can_Download){
    const end = Math.min(offset + CHUNK_SIZE, contentLength);
    const options = {
      headers: { 'Range': `bytes=${offset}-${end-1}` },
      rejectUnauthorized: false
    }
    let blob = await fetch(file_Loc ,options).then(r => {
      return r.status == 206 ? r.blob() : null;
    }).catch((e) => {
      console.log(e);
      fileStream = null;
      document.querySelector("#DLpertcentage").style.width = "100%";
      document.querySelector("#DLpertcentage").style.backgroundColor = "red";
      okBTN.innerHTML = "ERROR";
      console.log("Download is interrupt!!!");
      return;
    });
    if(blob != null){ //status 206 means fetch partial sucessful.
      fileStream.push(blob);
      blob = null;
      offset = end;
      const percentage = Math.round((offset / contentLength) * 100);
      document.querySelector("#DLpertcentage").style.width = percentage + "%";
      okBTN.innerHTML = percentage + "%";
    } else {
      fileStream = null;
      document.querySelector("#DLpertcentage").style.width = "100%";
      document.querySelector("#DLpertcentage").style.backgroundColor = "red";
      okBTN.innerHTML = "ERROR";
      console.log("Download is interrupt!!!");
      return;
    }
  }
  if(can_Download){
    const result = new Blob(fileStream, { type: passfile.headers.get('Content-type') });
    passfile = null;
    fileStream = null;
    document.querySelector("#DLpertcentage").style.width = "100%";
    document.querySelector("#DLpertcentage").style.backgroundColor = "lawngreen";
    okBTN.innerHTML = "UNZIP...";
    update_image(result);
  }
  return;
}


//fastboot flash part (like system, vendor, boot, etc...)
async function flash_part(file_Loc, part, file) {
  let okBTN = document.querySelector("#OK");
  okBTN.innerHTML = "flash:" + part;
  console.log("fastboot flash " + part + " " + file);
  console.log(fastboot.infoReturn());
  let entry = file_Loc.find((e) => e.filename === file);
  if (entry !== undefined) {
    let blob = await fastboot.zipGetData(entry, new fastboot.BlobWriter("application/octet-stream"), {
      onprogress: (bytes, len) => {
          onProgress("unpack", "test", bytes / len);
      },
    });
    await device.flashBlob(part, blob);
    blob = null;
  }
  okBTN.innerHTML = "flash " + part + " " + file + " OK!\n";
}

async function AOS9Flash(file_Loc){
  let product = await device.getVariable("product");
  let serial = await device.getVariable("serialno");
  let status = `Connect to ${product} (serial: ${serial})`;
  console.log(status); // //"flash sbl1 " + perm + "sbl1.mbn"
  await flash_part(file_Loc, "sbl1", "sbl1.mbn");
  await flash_part(file_Loc, "sbl1bak", "sbl1.mbn");
  await flash_part(file_Loc, "aboot", "emmc_appsboot.mbn");
  await flash_part(file_Loc, "abootbak", "emmc_appsboot.mbn");
  await flash_part(file_Loc, "partition", "gpt_both0.bin");
  await flash_part(file_Loc, "devcfg", "devcfg.mbn");
  await flash_part(file_Loc, "dtbo", "dtbo.img");
  await flash_part(file_Loc, "dtbobak", "dtbo.img");
  await flash_part(file_Loc, "vbmeta", "vbmeta.img");
  await flash_part(file_Loc, "vbmetabak", "vbmeta.img");
  await flash_part(file_Loc, "boot", "boot.img");
  await flash_part(file_Loc, "recovery", "recovery.img");
  await flash_part(file_Loc, "system", "system.img");
  await flash_part(file_Loc, "vendor", "vendor.img");
  await flash_part(file_Loc, "mdtp", "mdtp.img");
  await flash_part(file_Loc, "splash", "splash.img");
  await device.runCommand("erase:userdata");
  await device.runCommand("erase:cache");
  await device.runCommand("erase:misc");
  await device.runCommand("erase:devinfo");
  await device.runCommand("erase:reserved");
  await device.runCommand("erase:oem");
  await device.runCommand("reboot");
  return true;
}

async function AOS10Flash(file_Loc){//entries
  let product = await device.getVariable("product");
  let serial = await device.getVariable("serialno");
  let status = `Connect to ${product} (serial: ${serial})`;
  console.log(status); // //"flash sbl1 " + perm + "sbl1.mbn"
  await flash_part(file_Loc, "sbl1", "sbl1.mbn");
  await flash_part(file_Loc, "sbl1bak", "sbl1.mbn");
  await flash_part(file_Loc, "aboot", "emmc_appsboot.mbn");
  await flash_part(file_Loc, "abootbak", "emmc_appsboot.mbn");
  await flash_part(file_Loc, "partition", "gpt_both0.bin");
  await flash_part(file_Loc, "devcfg", "devcfg.mbn");
  await flash_part(file_Loc, "dtbo", "dtbo.img");
  await flash_part(file_Loc, "dtbobak", "dtbo.img");
  await flash_part(file_Loc, "vbmeta", "vbmeta.img");
  await flash_part(file_Loc, "vbmetabak", "vbmeta.img");
  await flash_part(file_Loc, "boot", "boot.img");
  await flash_part(file_Loc, "recovery", "recovery.img");
  await flash_part(file_Loc, "super", "super.img");
  await flash_part(file_Loc, "mdtp", "mdtp.img");
  await flash_part(file_Loc, "splash", "splash.img");
  await device.runCommand("erase:userdata");
  await device.runCommand("erase:cache");
  await device.runCommand("erase:misc");
  await device.runCommand("erase:devinfo");
  await device.runCommand("erase:reserved");
  await device.runCommand("erase:oem");
  await device.runCommand("reboot");
  return true;
}

async function AOS13Flash(file_Loc){
  let product = await device.getVariable("product");
  let serial = await device.getVariable("serialno");
  let status = `Connect to ${product} (serial: ${serial})`;
  console.log(status); // //"flash sbl1 " + perm + "sbl1.mbn"
  await flash_part(file_Loc, "partition", "gpt_both0.bin");
  await flash_part(file_Loc, "xbl_a", "xbl.elf");
  await flash_part(file_Loc, "xbl_b", "xbl.elf");
  await flash_part(file_Loc, "xbl_config_a", "xbl_config.elf");
  await flash_part(file_Loc, "xbl_config_b", "xbl_config.elf");
  await flash_part(file_Loc, "tz_a", "tz.mbn");
  await flash_part(file_Loc, "tz_b", "tz.mbn");
  await flash_part(file_Loc, "rpm_a", "rpm.mbn");
  await flash_part(file_Loc, "rpm_b", "rpm.mbn");
  await flash_part(file_Loc, "hyp_a", "hyp.mbn");
  await flash_part(file_Loc, "hyp_b", "hyp.mbn");
  await flash_part(file_Loc, "keymaster_a", "km41.mbn");
  await flash_part(file_Loc, "keymaster_b", "km41.mbn");
  await flash_part(file_Loc, "modem_a", "NON-HLOS.bin");
  await flash_part(file_Loc, "modem_b", "NON-HLOS.bin");
  await flash_part(file_Loc, "dsp_a", "dspso.bin");
  await flash_part(file_Loc, "dsp_b", "dspso.bin");
  await flash_part(file_Loc, "devcfg_a", "devcfg.mbn");
  await flash_part(file_Loc, "devcfg_b", "devcfg.mbn");
  await flash_part(file_Loc, "qupfw_a", "qupv3fw.elf");
  await flash_part(file_Loc, "qupfw_b", "qupv3fw.elf");
  await flash_part(file_Loc, "featenabler_a", "featenabler.mbn");
  await flash_part(file_Loc, "featenabler_b", "featenabler.mbn");
  await flash_part(file_Loc, "bluetooth_a", "BTFM.bin");
  await flash_part(file_Loc, "bluetooth_b", "BTFM.bin");
  await flash_part(file_Loc, "logfs", "logfs_ufs_8mb.bin");
  await flash_part(file_Loc, "storsec", "storsec.mbn");
  await flash_part(file_Loc, "imagefv_a", "imagefv.elf");
  await flash_part(file_Loc, "imagefv_b", "imagefv.elf");
  await flash_part(file_Loc, "uefisecapp_a", "uefi_sec.mbn");
  await flash_part(file_Loc, "uefisecapp_b", "uefi_sec.mbn");
  await flash_part(file_Loc, "abl_a", "abl.elf");
  await flash_part(file_Loc, "abl_b", "abl.elf");
  await flash_part(file_Loc, "boot_a", "boot.img");
  await flash_part(file_Loc, "boot_b", "boot.img");
  await flash_part(file_Loc, "dtbo_a", "dtbo.img");
  await flash_part(file_Loc, "dtbo_b", "dtbo.img");
  await flash_part(file_Loc, "super", "super.img");
  await flash_part(file_Loc, "vbmeta_system_a", "vbmeta_system.img");
  await flash_part(file_Loc, "vbmeta_system_b", "vbmeta_system.img");
  await flash_part(file_Loc, "metadata", "metadata.img");
  await flash_part(file_Loc, "recovery_a", "recovery.img");
  await flash_part(file_Loc, "recovery_b", "recovery.img");
  await flash_part(file_Loc, "vbmeta_a", "vbmeta.img");
  await flash_part(file_Loc, "vbmeta_b", "vbmeta.img");
  await device.runCommand("erase:userdata");
  await device.runCommand("erase:misc");
  await device.runCommand("erase:reserved");
  await device.runCommand("erase:oem");
  await device.runCommand("reboot");
  return true;
}

//Start flash image
async function update_image(perm, retry=false) {
  // let file_Loc = window.location.href + "image_buffer/" + perm;
  let reader = new fastboot.ZipReader(new fastboot.BlobReader(perm));
  let entries = await reader.getEntries();
  reader = null;
  let okBTN = document.querySelector("#OK");
  let cancelBtn = document.querySelector("#cancel");
  if(ADB_mode && retry == false) {
    await adb.shell("reboot bootloader");
    await webusb.close();
    wait(10000);
  } else if(!ADB_mode && retry == true){
    alert("Please comfirm that you select correct device for image update!");
    alert("If you make a wrong selection, it would make your device malfunction!");
  }
  okBTN.style = "padding: 30px 10px; line-height: 90%;";
  okBTN.innerHTML = "FLASH " + serialNumber_backup;
  okBTN.addEventListener("click", async function() {
    // console.log(file_Loc);
    okBTN.style = "pointer-events: none; padding: 30px 10px; line-height: 90%;";
    okBTN.innerHTML = "Fetching...";
    cancelBtn.style = "pointer-events: none; padding: 30px 10px;";
    wait(300);
    okBTN.innerHTML = "Flashing...";
    if(ADB_mode) {
      try{
        webusb = await Adb.open("WebUSB");
      } catch(e){
        if(e.name == "NotFoundError"){
          alert("No device selected!");
        } else if(e.name == "NetworkError"){
          alert("Some thing wrong, please try again!");
          alert("Try use this command on terminal -> 'adb kill-server'");
        } else {
          alert(e);
        }
        return update_image(perm, true);
      }
      if(serialNumber_backup != webusb.device.serialNumber){
        alert("Wrong device you selected!!!");
        alert("Please select device '" + serialNumber_backup + "'");
        return update_image(perm, true);
      }
      device.device = webusb.device;
      await device._validateAndConnectDevice();
    }
    let part = await device.getVariable("partition-type:super");//AOS10?
    if(part === null && AOS == 9){//AOS9
      console.log("AOS9");
      await AOS9Flash(entries);
    } else { //AOS10 or 13
      part = await device.getVariable("partition-type:devcfg_a");
      if(part === null && AOS == 10){//AOS10
        console.log("AOS10");
        await AOS10Flash(entries);
      } else if(AOS == 13) {
        console.log("AOS13");
        await AOS13Flash(entries);
      }
    }
    okBTN.innerHTML = "FLASHED!";
    document.querySelector("#cancel").innerHTML = "CLOSE！";
    alert("Update finished!!!\nReload this window!");
    cancelBtn.style = "padding: 30px 10px;";
    window.location.reload();
  }, {once: true});
}


/*Download pop up page make
/ In this session, program can simple distinguish 
/ if you choose correct project and image or not!
*/
function downloadpage(perm, filesize, filename, filetype) {
  if(!filename.includes("OTA") && !filename.includes("QFIL") &&
     !filename.includes("kernel") && !filename.includes("target") &&
     (perm.includes(check_proName) || check_proName=="")){ // Simple distinguishment
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
    okBTN.innerHTML = "Download";
    okBTN.style = "padding: 30px 10px;";
    let cancelBTN = document.createElement("a");
    cancelBTN.id = "cancel";
    cancelBTN.classList.add("btn-wave", "btn-resize2");
    cancelBTN.innerHTML = "Cancel";
    cancelBTN.style = "padding: 30px 10px;";
    DPI_BTN.appendChild(okBTN);
    DPI_BTN.appendChild(cancelBTN);
    p.innerHTML = filename;
    p.id = "status";
    DP.style = "visibility: visible";
    DPI.classList.add(filetype);
    DPI.appendChild(p);
    cancelBTN.addEventListener("click", function() {
      DPI.classList.remove(filetype);
      DP.style = "visibility: hidden";
      can_Download = false;
      while(DPI.lastChild)
        DPI.removeChild(DPI.lastChild);
      wait(500);
      can_Download = true;
    });
    okBTN.addEventListener("click", function() {
      console.log([filename, filesize]);
      okBTN.style = "pointer-events: none; padding: 30px 10px;";
      okBTN.innerHTML = "Downloading...";
      downloadFTP(perm + filename ,filename);
    }, {once: true});
  } else {
    alert("選錯project或是檔案！");
  }
}