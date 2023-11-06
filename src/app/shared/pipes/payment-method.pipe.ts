import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'paymentmethod',
    pure: true
})
export class PaymentMethodPipe implements PipeTransform {

    transform(method: string): any {
        if (method == 'ideal') {
            return 'iDEAL'
        } else if (method == 'creditcard') {
            return 'Credit Card'
        } else if (method == 'afterpay') {
            return 'Pay afterward'
        } else {
            return ''
        }
    }
}