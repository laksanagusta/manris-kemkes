export function getMonitoringWindow(cycle:string) {
 const match=/^(\d{4})-Q([1-4])$/.exec(cycle);
 if(!match)return null;
 const year=Number(match[1]), month=Number(match[2])*3;
 return {start:new Date(Date.UTC(year,month,1)-7*3600000),end:new Date(Date.UTC(year,month+1,1)-7*3600000)};
}
export function isMonitoringWindowOpen(cycle:string,now=new Date()) {
 const window=getMonitoringWindow(cycle);
 return Boolean(window && now>=window.start && now<window.end);
}
export function monitoringWindowMessage(cycle:string) {
 const window=getMonitoringWindow(cycle);
 if(!window)return "Periode pemantauan tidak valid.";
 const month=new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric",timeZone:"Asia/Jakarta"}).format(window.start);
 return `Pemantauan ${cycle} hanya dapat diisi selama ${month} (waktu Jakarta). Di luar periode tersebut, pemantauan terkunci dan hanya dapat dibaca.`;
}
