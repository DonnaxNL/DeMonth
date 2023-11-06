import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'country',
    pure: true
})
export class CountryPipe implements PipeTransform {
    countries = [['nl', 'Nederland'], ['be', 'Belgium'], ['de', 'Germany'], ['fr', 'France'], ['uk', 'United Kingdom']];

    transform(countryCode: string): any {
        for (let i = 0; i < this.countries.length; i++) {
            const country = this.countries[i];
            if (country[0] == countryCode) {
                return country[1].toUpperCase()
            }
        }
    }
}