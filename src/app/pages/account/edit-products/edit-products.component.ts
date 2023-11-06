import { Component, OnInit, Inject, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AngularFireFunctions } from '@angular/fire/functions';
import { AnalyticsService } from 'src/app/services/analytics-service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PageDetailService } from 'src/app/services/page-detail-service';
import { DatePipe } from '@angular/common';
import { OrderService } from 'src/app/services/firebase/order-service';
import { AccountComponent } from '../account.component';
import { Boxes } from 'src/app/constants/boxes';
@Component({
  selector: 'edit-products',
  templateUrl: './edit-products.component.html',
  styleUrls: ['./edit-products.component.scss']
})
export class EditProductsComponent implements OnInit {

  @Input() componentData
  boxType
  boxTypeId
  checkoutPrice
  products

  newProducts
  newProductQuantity

  showPreferences = false
  disableProductSubmit = true
  disablePreferenceSubmit = true

  constructor(
    private titleService: PageDetailService,
    private analytics: AnalyticsService,
    private dataRoute: ActivatedRoute,
    public boxes: Boxes,
    public orderService: OrderService,
    public fun: AngularFireFunctions,
    public datepipe: DatePipe,
    public account: AccountComponent
  ) { }

  ngOnInit() {
    if (!this.componentData) {
      var orderRef = this.dataRoute.snapshot.paramMap.get('ref')
      console.log(orderRef);
      if (orderRef == null || orderRef == 'undefined') {
        this.account.updateData('subscriptions', this.componentData)
      } else {
        this.componentData = {
          orderRef: orderRef
        }
        this.returnToOrder()
      }
    } else {
      this.boxType = this.boxes.getBoxById(this.componentData.boxTypeId)
      this.products = JSON.parse(this.componentData.products)
      console.log(this.products, this.componentData)
      this.showPreferences = this.componentData.showPreferences
      if (this.showPreferences) {
        if (!this.products.preferences) {
          this.disablePreferenceSubmit = false
        }
        this.analytics.trackPage('Subscription - Edit Preferences')
        this.titleService.setDetails("subscription_edit_preferences")
      } else {
        this.analytics.trackPage('Subscription - Edit Products')
        this.titleService.setDetails("subscription_edit_products")
      }
    }
  }

  updateProducts(products, amount?, extraAmount?) {
    console.log('update on edit-product', products, amount)
    this.newProducts = products
    if (amount != null && extraAmount != null) {
      this.newProductQuantity = amount + extraAmount
      this.checkProductChanges()
    } else {
      if (JSON.parse(this.componentData.products).preferences) {
        this.newProductQuantity = this.componentData.productQuantity
        this.checkPreferenceChanges()
      }
    }
  }

  returnToOrder() {
    this.account.updateData('details', this.componentData)
  }

  saveProducts() {
    // Add history data
    const orderHistoryItem = {
      boxId: this.boxType.id,
      boxName: this.boxType.name,
      checkoutSummary: this.componentData.checkoutSummary,
      orderId: this.componentData.orderId,
      orderReference: this.componentData.orderRef,
      paymentPlan: this.componentData.paymentPlan,
      productQuantity: this.componentData.productQuantity,
      products: JSON.parse(this.componentData.products),
      subscriptionDetails: this.componentData.subscriptionDetails,
      userId: this.componentData.uid
    }
    var historyItem = {
      docId: this.datepipe.transform(new Date, 'yyyy-MM-dd_HH:mm') + '_products',
      changeType: 'Products edited.',
      changes: {
        before: {
          productQuantity: this.componentData.productQuantity,
          products: JSON.parse(this.componentData.products)
        },
        after: {
          productQuantity: this.newProductQuantity,
          products: this.newProducts
        }
      },
      dateChanged: new Date(),
      order: orderHistoryItem
    }

    this.checkoutPrice = this.componentData.checkoutSummary.checkoutPrice
    var data = {
      uid: this.componentData.uid,
      orderId: this.componentData.orderId,
      orderRef: this.componentData.orderRef,
      productAmountBefore: this.componentData.productQuantity,
      productsBefore: JSON.parse(this.componentData.products),
      productAmountAfter: this.newProductQuantity,
      productsAfter: this.newProducts,
      checkoutPrice: null,
      subscriptionId: null,
      history: historyItem
    }
    console.log(data)

    // Check shipping
    if (this.componentData.boxTypeId == 'box_01') {
      var baseShipping = 199
      if (data.productsAfter.pads == null) {
        this.componentData.checkoutSummary.shippingPrice = baseShipping
      } else {
        var maxiRegSelected = false
        var maxiSuperSelected = false
        for (let i = 0; i < data.productsAfter.pads.length; i++) {
          if (data.productsAfter.pads[i].name == 'Maxi Regular') {
            maxiRegSelected = true
          }
          if (data.productsAfter.pads[i].name == 'Maxi Super') {
            maxiSuperSelected = true
          }
        }
        if (maxiSuperSelected) {
          this.componentData.checkoutSummary.shippingPrice = 245
        } else if (maxiRegSelected) {
          this.componentData.checkoutSummary.shippingPrice = 235
        } else {
          this.componentData.checkoutSummary.shippingPrice = 229
        }
      }
    }

    this.componentData.checkoutSummary.checkoutPrice = (this.componentData.checkoutSummary.shippingPrice * this.componentData.paymentPlan) + this.componentData.checkoutSummary.subTotal
    if (data.productsAfter && data.productsAfter.extraProducts) {
      this.componentData.checkoutSummary.checkoutPrice = this.componentData.checkoutSummary.checkoutPrice + data.productsAfter.extraProducts.extraPrice
    }

    data.checkoutPrice = this.componentData.checkoutSummary.checkoutPrice
    data.subscriptionId = this.componentData.subscriptionDetails.subscriptionId
    console.log(data)

    if (data.checkoutPrice != this.checkoutPrice) {
      console.log('update Mollie', data.checkoutPrice, this.checkoutPrice)
      //TODO: warning dialog
      // if (data.checkoutPrice > this.checkoutPrice) {
      //   const dialogRef = this.dialog.open(ConfirmNonProductsDialog, {
      //     width: '300px'
      //   });

      //   dialogRef.afterClosed().subscribe(result => {
      //     if (result != undefined) {

      //     }
      //   });
      //   return;
      // }
      const updateSubscription = this.fun.httpsCallable('updateSubscriptionAmountCall');
      updateSubscription(data).subscribe();
    }

    const updateSlack = this.fun.httpsCallable('orderProductsChangedSlack');
    updateSlack(data).subscribe();
    // Save
    this.orderService.updateOrderProducts(this.componentData.uid, this.componentData.orderId, this.newProducts, data.history, this.componentData.checkoutSummary, this.newProductQuantity)

    this.returnToOrder()
  }

  checkProductChanges() {
    const oldProducts = JSON.parse(this.componentData.products)
    var duplicateTampons = false
    var duplicatePads = false
    var duplicateLiners = false
    var extraHasChanged = false
    var duplicateExtraTampons = false
    var duplicateExtraPads = false
    var duplicateExtraLiners = false
    var duplicateRemoveBuds = false
    if (oldProducts.pads && this.newProducts.pads) {
      duplicatePads = this.arraysEqual(oldProducts.pads, this.newProducts.pads, true)
    } 
    if (oldProducts.tampons && this.newProducts.tampons) {
      duplicateTampons = this.arraysEqual(oldProducts.tampons, this.newProducts.tampons, true)
    } 
    if (oldProducts.liners && this.newProducts.liners) {
      duplicateLiners = this.arraysEqual(oldProducts.liners, this.newProducts.liners, true)
    } 
    if (oldProducts.extraProducts) {
      if (this.newProducts.extraProducts) {
        if (oldProducts.extraProducts.pads && this.newProducts.extraProducts.pads) {
          duplicateExtraPads = this.arraysEqual(oldProducts.extraProducts.pads, this.newProducts.extraProducts.pads, true)
          if (!duplicateExtraPads) {
            extraHasChanged = true
          }
        } else if (oldProducts.extraProducts.tampons && this.newProducts.extraProducts.tampons) {
          duplicateExtraTampons = this.arraysEqual(oldProducts.extraProducts.tampons, this.newProducts.extraProducts.tampons, true)
          if (!duplicateExtraTampons) {
            extraHasChanged = true
          }
        } else if (oldProducts.extraProducts.liners && this.newProducts.extraProducts.liners) {
          duplicateExtraLiners = this.arraysEqual(oldProducts.extraProducts.liners, this.newProducts.extraProducts.liners, true)
          if (!duplicateExtraLiners) {
            extraHasChanged = true
          }
        }
      } else {
        extraHasChanged = true
      }
    } 
    if (oldProducts.removeBuds == this.newProducts.removeBuds) {
      duplicateRemoveBuds = true
    } else {
      duplicateRemoveBuds = false
    }
    console.log('dups:', duplicatePads, duplicateTampons, duplicateLiners, 
    'extraChanged: ', extraHasChanged,  
    'dupsExtra:', duplicateExtraPads, duplicateExtraTampons, duplicateExtraLiners, 
    'removeBuds:', duplicateRemoveBuds)
    if (duplicateTampons && duplicatePads && duplicateLiners && duplicateRemoveBuds) {
      if (extraHasChanged && oldProducts.extraProducts) {
        if (this.newProducts.extraProducts) {
          if (!duplicateExtraTampons && !duplicateExtraPads && !duplicateExtraLiners) {
            this.disableProductSubmit = false
          } else {
            this.disableProductSubmit = true
          }
        } else {
          this.disableProductSubmit = false
        }
      } else {
        this.disableProductSubmit = true
      }
    } else {
      this.disableProductSubmit = false
    }
  }

  savePreferences() {
    if (!this.newProducts) {
      this.products.preferences = {
        chocolate: ['no_pref'],
        healthbar: ['none'],
        skinType: 'no_pref'
      }
      this.newProductQuantity = this.componentData.productQuantity
      this.newProducts = this.products
    }
    console.log(this.products, this.newProducts)
    // Add history data
    const orderHistoryItem = {
      boxId: this.boxType.id,
      boxName: this.boxType.name,
      checkoutSummary: this.componentData.checkoutSummary,
      orderId: this.componentData.orderId,
      orderReference: this.componentData.orderRef,
      paymentPlan: this.componentData.paymentPlan,
      productQuantity: this.componentData.productQuantity,
      products: JSON.parse(this.componentData.products),
      subscriptionDetails: this.componentData.subscriptionDetails,
      userId: this.componentData.uid
    }
    var historyItem = {
      docId: this.datepipe.transform(new Date, 'yyyy-MM-dd_HH:mm') + '_preference',
      changeType: 'Preference edited.',
      changes: {
        before: {
          preferences: JSON.parse(this.componentData.products).preferences ? JSON.parse(this.componentData.products).preferences : 'None'
        },
        after: {
          preferences: this.newProducts.preferences
        }
      },
      dateChanged: new Date(),
      order: orderHistoryItem
    }

    var data = {
      uid: this.componentData.uid,
      orderId: this.componentData.orderId,
      orderRef: this.componentData.orderRef,
      productsBefore: JSON.parse(this.componentData.products),
      productsAfter: this.newProducts,
      history: historyItem
    }
    console.log(data)

    const updateSlack = this.fun.httpsCallable('orderPreferencesChangedSlack');
    updateSlack(data).subscribe();
    // Save
    this.orderService.updateOrderProducts(this.componentData.uid, this.componentData.orderId, this.newProducts, data.history)

    this.returnToOrder()
  }

  checkPreferenceChanges() {
    const oldPreferences = JSON.parse(this.componentData.products).preferences
    console.log(oldPreferences, this.newProducts.preferences)
    var duplicateChocolate = false
    var duplicateHealthbar = false
    var duplicateGranola = false
    var duplicateSkinType = false
    if (oldPreferences.chocolate && this.newProducts.preferences.chocolate) {
      var duplicateChocolate = this.arraysEqual(oldPreferences.chocolate, this.newProducts.preferences.chocolate, false)
    }
    if (oldPreferences.healthbar && this.newProducts.preferences.healthbar) {
      var duplicateHealthbar = this.arraysEqual(oldPreferences.healthbar, this.newProducts.preferences.healthbar, false)
    }
    if (oldPreferences.granola && this.newProducts.preferences.granola) {
      var duplicateGranola = this.arraysEqual(oldPreferences.granola, this.newProducts.preferences.granola, false)
    }
    if (oldPreferences.skinType == this.newProducts.preferences.skinType) {
      duplicateSkinType = true
    } else {
      duplicateSkinType = false
    }
    console.log(duplicateChocolate, duplicateHealthbar, duplicateGranola, duplicateSkinType)
    if (duplicateChocolate && duplicateHealthbar && duplicateGranola && duplicateSkinType) {
      this.disablePreferenceSubmit = true
    } else {
      this.disablePreferenceSubmit = false
    }
  }

  arraysEqual(_arr1, _arr2, isProduct) {

    if (!Array.isArray(_arr1) || ! Array.isArray(_arr2) || _arr1.length !== _arr2.length)
      return false;

    var arr1 = _arr1.concat().sort();
    var arr2 = _arr2.concat().sort();

    for (var i = 0; i < arr1.length; i++) {
      if (isProduct) {
        if (arr1[i].id !== arr2[i].id || arr1[i].amount !== arr2[i].amount) {
          return false;
        }
      } else {
        if (typeof arr1[i] == 'string' && typeof arr2[i] == 'string') {
          if (arr1[i] !== arr2[i]) {
            return false;
          }
        } else if (arr1[i].id !== arr2[i].id) {
          return false;
        } 
      }
    }
    return true;
  }
}

export interface DialogData {
  oldAmount: number;
  newAmount: number;
}

@Component({
  selector: 'confirm-dialog',
  templateUrl: 'confirm-dialog.html',
})
export class ConfirmProductsDialog {

  constructor(
    public dialogRef: MatDialogRef<ConfirmProductsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData) { }

  onNoClick(): void {
    this.dialogRef.close();
  }
}