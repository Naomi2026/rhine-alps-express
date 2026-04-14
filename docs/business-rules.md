RHINE ALPS EXPRESS — CONSOLIDATED BUSINESS RULES
1. BUSINESS OVERVIEW
Rhine Alps Express is a bottled water ordering and delivery platform serving homes, estates, offices, shops, gyms, schools, churches, and apartment clusters.
The platform supports 4 user roles:
Customer
Rider
Admin
Super Admin
The system shall support:
customer registration and login
location-based pricing
order placement and tracking
delivery slot selection
M-Pesa and Cash on Delivery payment flows
OTP-based delivery confirmation
customer credit handling
loyalty tracking
rider assignment and delivery execution
admin and super admin controls
audit logging and reporting

2. BUSINESS OPERATING HOURS AND ORDER TIMING
2.1 Operating hours
Standard delivery operating hours shall be 9:00 AM to 5:00 PM.
The business shall continue accepting order placement until 8:00 PM.
The final delivery slot of the day shall run from 5:00 PM to 7:45 PM.
2.2 Same-day cutoff
The standard same-day delivery cutoff shall be 6:30 PM.
Orders placed on or before 6:30 PM may qualify for same-day delivery, subject to slot availability, operational capacity, and location band rules.
Orders placed after 6:30 PM shall follow location-band rules for same-day eligibility.
2.3 Same-day eligibility by location band
Band 1 orders may still qualify for same-day delivery after 6:30 PM if there is an available slot and operational capacity.
Band 2 and Band 3 orders placed after 6:30 PM shall be scheduled for the next available delivery date.
Orders placed after 8:00 PM shall be treated as next-day orders and processed when the business reopens.

3. DELIVERY SLOTS
3.1 Fixed slot structure
The initial slot structure shall be:
9:00 AM to 12:00 PM
12:00 PM to 3:00 PM
3:00 PM to 5:00 PM
5:00 PM to 7:45 PM
3.2 Slot availability
Delivery slots shall be available every operating day unless disabled by admin or operational rules.
The system shall show available delivery slots to the customer before order confirmation.
The customer shall be required to select a delivery slot before submitting the order.
3.3 Slot assignment rules
An order placed during an active slot may still be assigned to that slot if it meets the minimum lead-time rule and operational capacity allows.
The minimum lead time for booking a slot shall be 30 minutes.
If the selected slot does not meet the minimum lead time or has no available capacity, the system shall offer the next available slot automatically.
3.4 Slot capacity model
Slot capacity shall be measured as the maximum number of orders allowed per zone per delivery slot.
Slot capacity shall be zone-based.
This shall be the MVP capacity model.
3.5 Overbooking and reservation
Admin may overbook a full slot.
A selected slot shall be reserved temporarily during checkout for 4 hours.
Unpaid orders shall hold slot capacity during the reservation window.
If a slot becomes full after checkout but before payment confirmation, the order shall still be delivered.

4. CUSTOMER REGISTRATION, AUTHENTICATION, AND SESSION RULES
4.1 Registration
The system shall require the customer to provide an initial delivery location during account registration.
The initial delivery location shall be saved as the customer’s default registered delivery location.
The default registered delivery location shall include:
address or area name entered by the customer
mapped geo-coordinates
location reference returned by the map service, where available
4.2 Default address behavior
The default registered delivery location shall be used to prefill future orders.
The customer shall be allowed to edit or replace the default address.
The customer shall not be allowed to save multiple addresses in the MVP.
Address labels such as home, office, or other shall not be used in the MVP.
The delivery location used for pricing and fulfillment shall always be the active location selected for the current order, not automatically the saved default address.
4.3 Contact requirements
A customer shall not be allowed to place an order unless they provide at least one valid contact method.
Accepted contact methods shall be:
a valid Kenyan mobile phone number
a valid email address
At least one valid contact method must be present before checkout can be completed.
Phone number shall be the primary contact method for delivery coordination.
4.4 Session persistence
Once a customer has logged in, their session should remain active unless they explicitly log out, change devices, or a security/session policy requires termination.
If a customer has an active order, the app shall keep their session active to support tracking and payment completion.
Customer logout shall occur on device change.
Customer sessions shall be designed for low-friction repeat usage.
Admin sessions may remain active for up to 9 hours.
Rider and admin sessions may follow different security rules from customer sessions.
4.5 Password reset and security
Customers may reset password automatically through the standard customer password reset flow.
Rider password reset shall require Super Admin approval.
Admin password reset requests shall require Super Admin approval.
Failed login threshold shall be 3 attempts.
If rider, admin, or operations user fails login 3 times, the account shall be locked and a request sent to Super Admin.
Device or session revocation shall be supported.
Multiple concurrent logins shall not be allowed for riders or admins.

5. LOCATION AND SERVICEABILITY RULES
5.1 Delivery location requirements
Delivery geolocation shall be mandatory for order placement.
The system shall not allow checkout if the delivery location is empty, invalid, or not captured.
The delivery location attached to the order shall be the official location used for pricing, routing, delivery, and admin/rider reference.
5.2 Dispatch location
The dispatch location shall be Rhine Alps Limited at Infinity Industrial Park.
5.3 Maximum service radius
The maximum delivery radius from the dispatch location shall be 30 kilometres.
5.4 Restricted areas
There shall be no permanently excluded service areas in MVP.
5.5 Invalid map pin handling
If the map pin is clearly invalid, the customer must provide the nearest landmark.
The order may still proceed for admin review and validation.
5.6 Map lookup failure
If map lookup fails but address text exists, the customer may still place the order.
Such orders shall be subject to validation and possible admin review.
5.7 Far-distance approval
Admin may manually approve a far-away location where necessary.
5.8 Provisional pricing
Orders may proceed with provisional pricing before final location validation.

6. PRODUCT RULES
6.1 MVP product
The MVP shall support a 20-litre bottle product.
6.2 New bottle purchase
A new bottle purchase shall cost KES 450.
6.3 Multiple product types in one order
A customer may order multiple bottle types in one order where supported by the product catalog.
6.4 Quantity limits
Minimum order quantity shall be 1 bottle.
Maximum order quantity per order shall be 20 bottles.
6.5 Empty bottle exchange
Empty bottle return/exchange shall exist in the MVP.
Where applicable, the customer must provide the empty bottle for refill or exchange fulfillment.
6.6 Stock behavior
The MVP shall assume stock availability at all times.
Stock shall not block checkout in MVP.
Out-of-stock handling shall not apply in MVP.

7. PRICING RULES
7.1 Band 1 pricing
Orders delivered within a 0–2 kilometre radius from the dispatch location shall fall under Band 1 pricing.
Band 1 orders shall be charged KES 150 per bottle with no delivery fee.
7.2 Band 2 pricing
The following predefined service areas shall fall under Band 2 pricing:
Kamakis
Mwihoko
Kahawa Sukari
Githurai
EasternVille
Band 2 orders shall be charged KES 200 per bottle with no separate delivery fee.
7.3 Band 3 pricing
Orders delivered to all other valid service areas outside Band 1 and Band 2 shall fall under Band 3 pricing.
Band 3 orders shall be charged KES 150 per bottle plus a delivery fee of KES 30 per kilometre per order.
The Band 3 delivery fee shall apply per order, not per bottle.
The Band 3 delivery fee shall be calculated using total distance from the dispatch location to the active delivery location.
7.4 Pricing precedence
The system shall determine the pricing band using this order:
check whether the delivery location is within the 0–2 km Band 1 radius
check whether the delivery location matches a predefined Band 2 area
if neither applies, assign Band 3 pricing
7.5 Location conflict handling
Where typed area name conflicts with mapped distance or geo-location, the system shall use:
validated mapped geo-location and distance from dispatch point
predefined service area mapping and aliases
admin review if still ambiguous
Only Super Admin shall be allowed to override pricing.
7.6 Pricing visibility
The system shall show the customer the applicable bottle price and delivery fee separately before order confirmation.
If a location requires validation or is ambiguous, the customer shall first see provisional delivery charges.
Once validated, the final delivery fee shall be shown.
7.7 Outside standard service area
Areas outside Band 1 and Band 2 shall be treated as Band 3, not unsupported.
If the location is valid but outside standard mapped service areas, the system shall calculate distance and show provisional delivery charges rather than blocking checkout.

8. ORDER PLACEMENT, EDIT, AND RESCHEDULE RULES
8.1 Order placement
Customer shall select delivery slot, delivery location, product quantity, and payment method before submitting the order.
8.2 Quantity edits
A customer shall not change quantity after placing the order.
8.3 Delivery location edits
A customer may change the delivery location after placing the order.
8.4 Slot edits
A customer may change the selected slot after placing the order.
8.5 Payment method edits
A customer may change the payment method after placing the order.
8.6 Edit cutoff
Once an order has been confirmed by admin, the customer shall no longer be allowed to change the order.
8.7 Repricing on edit
Any permitted location or payment-related change that affects price shall trigger repricing.
8.8 Edit approval
Customer edits before admin confirmation shall not require admin approval.
8.9 Rescheduling
A customer may request reschedule from the app.
A rider shall not trigger reschedule.
Admin may reschedule an order after failed delivery.
An order may be rescheduled only once.
Same-day reschedule shall be allowed.
Repricing shall not occur purely because of rescheduling to another day or slot.
Rescheduling shall not affect loyalty eligibility.

9. PAYMENT RULES
9.1 General payment control
Order status and payment status shall be managed separately.
An order shall not be marked as fully completed unless it has been paid for or validly settled.
Admin shall not be allowed to mark an order as completed if payment status is unpaid, pending verification, or otherwise not settled.
Payment status shall be visible in the admin panel, rider console where relevant, and customer-facing order view where relevant.
9.2 Supported payment methods
Supported payment methods shall be:
M-Pesa
Cash on Delivery
9.3 Payment timing
M-Pesa payment shall happen after order submission.
9.4 Pay-later eligibility
Pay-later shall be allowed only for Band 1 and Band 2 orders.
9.5 COD eligibility
Cash on Delivery shall be allowed for all customers.
Cash on Delivery shall not be allowed for Band 3 orders.
9.6 Assignment of unpaid M-Pesa orders
An unpaid M-Pesa order may still be assigned to a rider for Band 1 and Band 2.
An unpaid M-Pesa Band 3 order shall not be assigned to a rider until payment conditions are satisfied.
9.7 M-Pesa validation
If a customer pays via M-Pesa using their registered phone number, the system may attempt automatic matching where integration is available.
If the customer pays using a different phone number, the customer must provide a valid M-Pesa transaction code as proof of payment.
If the customer chooses to pay later, the system shall allow them to provide a short payment description or note.
Once the customer shares the M-Pesa transaction code with admin, the admin must enter the code against the correct order.
The payment shall only move to paid after the transaction code has been entered and validated against the order.
The admin panel shall include a payment reference field for manual entry of the M-Pesa code.
The system shall store:
transaction code
related order
admin user who entered it
date and time entered
Duplicate use of the same M-Pesa transaction code across multiple orders shall not be allowed unless explicitly overridden by Super Admin.
If the payment code is missing, invalid, or unreviewed, payment status shall remain unpaid or pending verification.
9.8 Cash on Delivery
Cash on Delivery orders may proceed through confirmation, preparation, rider assignment, and dispatch before payment is marked as paid.
The rider shall be allowed to collect cash on delivery where applicable.
The rider must record the amount of cash received against the order.
If the customer pays in cash, the customer must provide a note indicating that the order was paid in cash.
If the customer requires change, the rider shall request M-Pesa payment where possible.
If change cannot be returned in cash, the remaining amount shall be recorded as customer credit.
A cash-on-delivery order shall not be marked as completed until the rider confirms payment received and the order satisfies all completion rules.
9.9 Partial payment
Partial payment shall be supported in MVP.
The system shall allow an order to remain in partially paid state until the remaining balance is settled using an approved payment method.
9.10 Unpaid order reminders
If a customer has not completed payment, the system shall automatically send a reminder after 12 hours.
If payment remains incomplete, the system shall automatically send another reminder after 24 hours.
Reminder messages shall be sent using the available customer contact method, prioritizing phone where applicable.
The admin dashboard shall surface unpaid orders every 12 hours.
Each unpaid order record shown to admin shall include at minimum:
customer name
phone number
order reference
time since order was placed
payment status
9.11 Mixed settlement
One order may have mixed settlement, including:
credit plus cash
credit plus M-Pesa
9.12 One payment across multiple orders
One payment may cover multiple orders where excess payment exists and is explicitly allocated.

10. CUSTOMER CREDIT RULES
10.1 Customer credit policy
The business shall not issue cash refunds.
Any approved balance shall be converted into customer credit.
10.2 When customer credit is created
Customer credit may be created from:
cancelled paid orders
overpayments
change owed from cash payments
approved manual adjustments by admin or Super Admin
10.3 Customer credit visibility and use
Customer credit shall be visible to the customer in their account console.
Customer credit shall be visible to admin in:
customer profile
order details
payment section
filtered list/report of customers with available credit
Customer credit shall automatically be applied to the next eligible order.
If the next order total exceeds the available credit, the customer shall pay the remaining balance.
If the available credit exceeds the next order total, the remaining balance shall stay as customer credit.
10.4 Credit governance
Customer credit shall not expire.
Admin shall not manually reduce customer credit.
Admin shall not create customer credit without approval.
Super Admin approval shall be required above an approved credit threshold defined in system settings.
Customer credit shall not be disabled for a specific order.
Available customer credit shall be deducted automatically.
The customer shall not be allowed to opt out of using available credit.
Customer credit shall be applied to the final payable balance after pricing, discounts, and delivery fees have been calculated.

11. LOYALTY RULES
11.1 Loyalty program
The loyalty rule shall be one free bottle after 10 completed qualifying orders.
Only completed and valid qualifying orders shall count toward loyalty.
Cancelled, failed, unpaid, or invalid orders shall not count toward loyalty.
Approved replacement cases tied to an otherwise valid qualifying order shall still count toward loyalty progress.
11.2 Loyalty visibility
Customers shall be able to see their loyalty progress in the app.
The app shall show:
number of qualifying orders completed
number of qualifying orders remaining before the reward is earned
Admin shall be able to view loyalty progress and manage loyalty settings where permitted.
11.3 Reward redemption rules
The system shall assign the free bottle automatically.
The customer shall not choose the free SKU in MVP.
The free bottle must be redeemed only at the next eligible reward event after 10 completed qualifying orders.
Multiple loyalty rewards shall not accumulate.
One order shall not use both loyalty reward and customer credit together.
Loyalty rewards shall not expire.

12. ORDER STATUS RULES
12.1 Order statuses
The recommended order statuses shall be:
placed
awaiting payment
confirmed
preparing
ready for dispatch
assigned to rider
out for delivery
delivered
completed
failed delivery
cancelled
on hold
12.2 Order status visibility
Customers shall be able to track the status of their order.
Payment state shall also be visible where relevant.

13. DELIVERY STATUS RULES
13.1 Delivery statuses
The recommended delivery statuses shall be:
not scheduled
scheduled
assigned
picked up
in transit
arrived
pending otp confirmation
delivered
delivery attempted
failed
returned
13.2 Delivery sequencing
The rider shall be allowed to move an order only through approved delivery states.
Mandatory workflow steps shall not be skipped where sequential flow is required by the business.

14. PAYMENT STATUS RULES
14.1 Payment statuses
The recommended payment statuses shall be:
unpaid
pending verification
partially paid
paid
failed
credit applied
14.2 Policy distinction
“No refunds; use balance on next order” is a business policy, not a payment status.

15. OTP DELIVERY CONFIRMATION RULES
15.1 OTP generation and use
The system shall generate a unique OTP for each order for delivery confirmation.
The OTP shall be linked to the specific order and customer.
The rider shall obtain the OTP from the customer or an authorized recipient at the point of delivery.
A valid OTP may only be used once.
The OTP shall expire immediately after successful delivery confirmation.
Invalid, expired, or previously used OTPs shall not be accepted.
15.2 OTP enforcement
The rider shall not be able to mark an order as delivered unless the valid system-generated OTP has been entered and verified.
The admin console shall not allow an order to be marked as delivered unless OTP validation rules have been satisfied.
If OTP verification fails, the rider shall be allowed to retry within permitted limits.
If repeated OTP attempts fail beyond the allowed threshold, the order shall require admin review.
15.3 OTP retry and resend limits
Maximum OTP validation attempts shall be 3.
Maximum OTP resend attempts shall be 3.
Cooldown between resend attempts shall be 30 seconds.
OTP regeneration shall be system-controlled only.
15.4 OTP audit
The system shall record OTP verification history, including:
verification result
date and time
rider or admin user who submitted it
Any manual override of OTP confirmation shall be restricted to authorized admin users and shall require:
mandatory reason
admin identity
date and time
supporting note where applicable
15.5 OTP anti-abuse
OTP brute-force protection shall apply through retry limits, lock conditions, and audit visibility.

16. ORDER COMPLETION CONTROL
16.1 Delivered vs completed
Delivered and completed shall be treated as separate business states.
Delivered means goods were successfully handed over and OTP requirements were satisfied.
Completed means the order is delivered and all payment and business closure conditions are satisfied.
16.2 Completion control
A rider may complete the delivery handoff only after successful OTP confirmation.
Admin shall not mark the order as fully completed unless the payment status is confirmed as paid or otherwise validly settled.
The system shall prevent accidental closure of unpaid orders.

17. ADMIN RULES
17.1 Admin account management
Admin accounts shall only be created by Super Admin.
Admin console access shall require valid credentials.
Password reset requests for admin users shall require Super Admin approval.
Only authorized admin roles shall have access.
17.2 Admin permissions
Admin shall be able to manage:
orders
riders
customers
prices
loyalty settings
reporting
payment verification
customer credit visibility and application oversight
rider assignment and delivery progress monitoring
17.3 Protected actions
Authorized admin or super admin users, subject to permission level, may perform protected actions including:
override pricing
override duplicate M-Pesa transaction code
force-complete an order
manually confirm delivery without OTP
create or reverse credit
cancel a paid order
reopen a completed order
edit delivery address after dispatch
reassign rider after pickup only as an authorized admin override
17.4 Protected action audit
Every protected override action shall require:
mandatory reason code
free-text note where applicable
acting user identity
timestamp
audit trail entry

18. RIDER CONSOLE RULES
18.1 Rider access
Each rider shall log in with valid credentials before accessing the rider console.
The rider console shall only be accessible to users assigned the Rider role.
The rider’s active session shall be maintained until logout, timeout, or forced termination by the system.
18.2 Rider visibility
Riders shall only be able to view and manage orders assigned to them. The rider console shall display:
order number
customer name
customer phone number
delivery address
pinned location or map view
quantity ordered
payment status
order status
delivery notes where applicable
18.3 Rider permissions and restrictions
Riders shall not manually override payment status.
Riders shall not manually override OTP validation.
Riders shall not reassign an order to another rider without admin authorization.
Riders shall not cancel dispatched or in-transit orders.
Riders shall not refund or reprice an order unless explicitly granted those permissions by the business.
18.4 Rider notifications
The system shall notify the rider when a new order is assigned and of relevant updates including:
location update
customer contact update
payment confirmation
delivery note changes
reassignment
cancellation
18.5 Rider proof-of-delivery and reporting
Rider may upload a note or photo for failed delivery.
Rider must capture the actual cash amount collected.
Rider may record “customer refused order.”
Rider may report damaged goods at handoff.
Rider must record who received the order if the recipient is not the customer.
GPS timestamp at arrival and delivery shall be required.
18.6 Assignment and dispatch
One rider may carry multiple orders per slot.
If a rider rejects assignment, admin shall be informed and the rider must provide a reason.
If a rider goes offline, the rider must inform admin.
Orders may be assigned either automatically or manually.
Rider workload shall not automatically block further assignment in MVP.
Reassignment after pickup shall be allowed only as an authorized admin override and must require a reason code plus audit log.

19. CUSTOMER SELF-SERVICE RULES
Customers may cancel either through the app or by contacting admin.
A cancellation reason shall be mandatory.
If no reason is provided, the cancellation request shall not be valid.
Customers shall be able to view invoices and receipts.
Customers shall be able to download payment confirmation.
Customers shall be able to see rider details.
Customers shall be able to call or chat the rider.
Customers shall be able to rate delivery.
Customers shall be able to report delivery issues from the app.

20. NOTIFICATION RULES
20.1 Customer notifications
Order placed confirmation shall be sent to the customer.
Payment confirmed notification shall be sent to the customer.
OTP notification shall follow the configured behavior.
Failed delivery notification shall be sent to the customer.
20.2 Admin notifications
Payment confirmed notification shall be visible to admin.
Failed delivery notification shall be visible to admin.
Unpaid order alerts shall be surfaced every 12 hours.
20.3 Rider notifications
Payment confirmed notification shall be visible to the rider where relevant.
Failed delivery notification and order updates shall be visible to the rider.
20.4 Channel and fallback rules
Notifications may be sent by SMS, WhatsApp, email, or in-app message, depending on event configuration.
If SMS fails, the system shall use alternative configured channels.
Duplicate notifications shall be suppressed.
OTP resend shall use the same channel each time unless fallback is triggered.
Admin shall be alerted if a customer does not receive OTP.
Customers shall receive slot reminders before delivery.

21. CANCELLATION, FAILED DELIVERY, RETURN, AND REPLACEMENT RULES
21.1 Customer cancellation
A customer may cancel an order before dispatch.
Once the order has been dispatched, the customer may no longer freely cancel it through standard self-service.
21.2 Admin cancellation
Admin may cancel an order in approved edge cases.
Riders shall not cancel dispatched or in-transit orders.
21.3 Cancellation and payment effect
If a paid order is cancelled, the paid amount shall be converted to customer credit.
If an order has already been dispatched or delivered, the customer shall remain liable for payment under the applicable business rule.
21.4 Failed delivery
If a customer is unreachable, OTP cannot be confirmed after retries, payment is unresolved where required, or delivery cannot be completed, the order shall move into failed delivery or on-hold flow.
Failed or exception orders shall be visible to admin for review and resolution.
The rider shall be required to record a reason for failed delivery.
21.5 Partial delivery
Partial delivery shall not be allowed in MVP.
21.6 Damaged goods
If goods are damaged, the case shall be recorded and escalated to admin.
Damaged goods shall be handled through replacement, not customer credit.
A note to admin shall be mandatory for damaged-goods cases.
21.7 Replacement
Replacement orders shall be allowed for damaged goods.
Replacement cases tied to a valid qualifying original order shall still count toward loyalty where the original order qualifies.
21.8 Returns
An order shall be treated as returned where there is customer complaint, failure to deliver, or lack of OTP and the goods are brought back.
Goods may be returned to dispatch in cases including customer complaint about water quality.
Opened water may be returned where approved under business policy.
Failed delivery with goods returned shall not automatically affect payment unless resolved by admin under the applicable business rule.
The rider must record returned quantity.
Return reason shall be mandatory.
21.9 Authorized recipient
If the customer is unavailable, delivery may still be completed if an authorized recipient provides the valid system-generated OTP for that order.
21.10 Pending delivery confirmation
If the customer does not receive the OTP or cannot access it at the time of delivery, the order shall not be marked as delivered and shall remain in pending delivery confirmation state.
21.11 Technical failure
If a technical failure prevents OTP validation, the order shall not be marked as delivered until OTP is successfully verified or an authorized exception process is applied.
21.12 Admin escalation
Where delivery cannot be completed, the rider shall be able to trigger escalation to admin support where configured.

22. CASH RECONCILIATION RULES
End-of-day rider cash reconciliation shall be required.
Rider must hand cash to admin and mark handoff.
Any cash discrepancy shall create an incident.
Customer shall receive receipt immediately where possible and after reconciliation where required by the payment flow.

23. REPORTING RULES
The system shall support:
daily sales reports
rider performance reports
unpaid orders reports
credit ledger reports
loyalty reports
Reports shall support:
Excel export
CSV export
date filters
audit filters

24. AUDIT TRAIL AND DATA RETENTION RULES
24.1 Auditability
The system shall log all critical actions performed by riders and admins, including:
status changes
payment code entry
cash collection acknowledgement
OTP submissions
delivery attempts
failed delivery reasons
overrides
timestamps of each action
24.2 Data protection
Riders and admins shall not be able to delete audit history related to orders, delivery attempts, payment verification, or OTP activity.
24.3 Audit retention
Audit logs shall be retained for 1 month in MVP.
24.4 Deleted users
Deleted users shall remain visible in audit history.
24.5 OTP storage
OTP values shall be stored in tokenized form, not as plain text.
24.6 Payment reference editing
Payment references shall not be editable after entry.
24.7 Override history
Any edit or override shall create a new audit record while preserving the old value.

25. ABUSE, DUPLICATE, AND RISK CONTROL RULES
Duplicate order detection within a short time window shall be supported.
Suspicious repeated use of manual price overrides shall be flagged.
Suspicious duplicate phone numbers or duplicate accounts shall be flagged.
Blacklisting or account suspension criteria shall be supported through admin controls.

26. REASON CODES
The system shall support controlled reason codes for the following business events:
cancelled
failed delivery
on hold
returned
manual override
payment failed
26.1 Cancelled
customer_request
duplicate_order
payment_not_completed
address_issue
admin_cancelled
fraud_suspected
26.2 Failed delivery
customer_unreachable
wrong_location
no_otp
otp_failed
customer_refused
payment_issue
rider_issue
technical_issue
26.3 On hold
payment_review
otp_failure
pricing_ambiguity
customer_requested_hold
rider_incident
technical_issue
26.4 Returned
failed_delivery_return
customer_complaint
water_quality_issue
damaged_goods
otp_not_confirmed
26.5 Manual override
otp_override
payment_override
pricing_override
reassignment_override
closure_override
26.6 Payment failed
mpesa_code_invalid
payment_not_received
duplicate_reference
partial_settlement_issue
verification_failed

27. FINAL NORMALIZATION RULES FOR ENGINEERING
The following implementation principles shall apply across the system:
Order status controls the business lifecycle.
Delivery status controls rider and logistics progress.
Payment status controls financial settlement.
“Delivered” means OTP-verified handoff.
“Completed” means delivered plus financially settled and fully closed.
Every protected action, override, and exceptional state must be auditable.
Super Admin shall control protected approvals including admin creation, admin reset approval, and protected financial or delivery overrides.


