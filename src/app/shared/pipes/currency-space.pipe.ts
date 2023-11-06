import {Pipe, PipeTransform} from "@angular/core";
import {CurrencyPipe} from "@angular/common";

@Pipe({name: 'currency'})
export class CustomCurrencyPipe extends CurrencyPipe implements PipeTransform {
  transform(value: any, currencyCode: string, symbolDisplay: string, digits: string): string {
    const currencyFormat = super.transform(value, currencyCode, symbolDisplay, digits);
    const firstDigit = currencyFormat.search(/\d/) - 1;
    return currencyFormat.substring(0, firstDigit) + currencyFormat.substr(firstDigit + 1);
  }
}