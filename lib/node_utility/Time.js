"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Time = void 0;
let instance;
class Time {
    constructor() {
        this.date = new Date();
        this.Separater = '|';
    }
    static GetInstance() {
        if (instance) {
            return instance;
        }
        instance = new Time();
        return instance;
    }
    GetTimeStamp() {
        this.date.setTime(Date.now());
        let dateStr = this.GetDateString();
        let tList = this.date.toTimeString().split(' ');
        dateStr += this.Separater + tList[0] + this.Separater + tList[1];
        return dateStr;
    }
    GetDateString() {
        return this.date.getFullYear().toString() + '/' + (this.date.getMonth() + 1).toString() + '/' + this.date.getDate().toString();
    }
    GetTimeInfo() {
        this.date.setTime(Date.now());
        return {
            year: this.date.getFullYear(),
            month: this.date.getMonth(),
            date: this.date.getDate(),
            hour: this.date.getHours(),
            minute: this.date.getMinutes(),
            second: this.date.getSeconds(),
            region: this.date.toTimeString().split(' ')[1]
        };
    }
    Parse(timeStamp) {
        let fieldList = timeStamp.split('|');
        let yearField = fieldList[0].split('/');
        let timeField = fieldList[1].split(':');
        return {
            year: Number.parseInt(yearField[0]),
            month: Number.parseInt(yearField[1]),
            date: Number.parseInt(yearField[2]),
            hour: Number.parseInt(timeField[0]),
            minute: Number.parseInt(timeField[1]),
            second: Number.parseInt(timeField[2]),
            region: fieldList[2]
        };
    }
    Stringify(timeData) {
        return timeData.year.toString() + '/' + timeData.month.toString() + '/' + timeData.date.toString() + '|'
            + timeData.hour.toString() + ':' + timeData.minute.toString() + ':' + timeData.second.toString() + '|'
            + timeData.region;
    }
    SetTimeSeparater(sep) {
        this.Separater = sep;
    }
    GetTimeSeparater() {
        return this.Separater;
    }
}
exports.Time = Time;
//# sourceMappingURL=Time.js.map