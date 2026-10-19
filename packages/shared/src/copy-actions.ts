// Action button labels, done labels and confirm-view steps (docs/10-ACTIONS.md §3–4). Steps are separated by " | ".
export const actionCopy = {
  'impact.per.week': '{value}/wk',
  'impact.per.month': '{value}/mo',
  'impact.per.once': '{value}',
  'impact.label.rating': 'Rating',
  'impact.label.confidence': 'Confidence',
  'impact.label.margin': '{value} margin',
  'impact.label.returns': '{value} returns',
  'impact.label.data': 'Data quality',
  'impact.label.watch': 'Watch',
  'impact.label.stars': '+{value} ★ in 6 wks',

  'action.amazon_coupon.run': 'Create coupon',
  'action.amazon_coupon.done': 'Coupon file ready',
  'action.amazon_coupon.steps':
    'Build the coupon file: {product}, {discount_pct}% off for {weeks} weeks | Save it to Drive Outbox and download it | Open Seller Central Coupons | Wait for you to confirm it is live, then measure for 21 days',
  'action.qa_hold.run': 'Raise QA hold',
  'action.qa_hold.done': 'QA hold raised',
  'action.qa_hold.steps':
    'Write the QA hold note: complaints, dates, quotes and the suspected batch | Assign it to the QA owner, due in 2 days | Notify them on Slack and in Drishti | Read out the rating and pump share in 6 weeks',
  'action.reply_drafts.run': 'Draft replies',
  'action.reply_drafts.done': 'Replies drafted',
  'action.reply_drafts.steps':
    'Pick negative {aspect} reviews without a reply | Draft a short reply for each; your team posts them | Save the sheet to Drive Outbox',
  'action.restock_request.run': 'Send restock request',
  'action.restock_request.done': 'Restock request sent',
  'action.restock_request.steps':
    'List the stores, units needed and days of cover for {city} | Send it to the supply owner on Slack | Track stockout days until stock is back',
  'action.qc_ads_pause.run': 'Turn on',
  'action.qc_ads_pause.done': 'Auto-pause on',
  'action.qc_ads_pause.steps':
    'Check stock in every dark store at each sync | Post the pause list per platform when a store has under 1 day of stock | Post the resume list when stock returns',
  'action.budget_shift.run': 'Apply budget shift',
  'action.budget_shift.done': 'Budget sheet ready',
  'action.budget_shift.steps':
    'Build the budget sheet: current and new spend by medium and city | Change Meta budgets when Meta is connected | Give you a checklist with the new daily budgets for the other platforms | Read it out in 4 weeks',
  'action.budget_change.run': 'Apply cut',
  'action.budget_change.done': 'Budget change ready',
  'action.budget_change.steps':
    'Build the budget sheet for {medium}: current and new daily budgets | Change budgets in Meta when it is connected, else give you a checklist | Read it out in 4 weeks',
  'action.shopify_discount_cap.run': 'Apply caps',
  'action.shopify_discount_cap.done': 'Caps applied',
  'action.shopify_discount_cap.steps':
    'Find the codes {segment} used in 90 days with more than {cap_pct}% off | Change each code to {cap_pct}% in Shopify | Save the old values so you can undo | Measure margin and repeat for 3 weeks',
  'action.shopify_segment_offer.run': 'Send offer',
  'action.shopify_segment_offer.done': 'Offer live',
  'action.shopify_segment_offer.steps':
    'Create the customer segment in Shopify | Create a discount code only that segment can use | Measure their orders against forecast',
  'action.audience_export.run': 'Export audience',
  'action.audience_export.done': 'Audience file ready',
  'action.audience_export.steps':
    'Fetch {segment} from Shopify | Hash emails and phones with SHA-256; keep nothing | Save the file to Drive Outbox with an upload checklist for Meta',
  'action.refill_nudge.run': 'Turn on nudge',
  'action.refill_nudge.done': 'Nudge on',
  'action.refill_nudge.steps':
    'Create the Shopify segment of buyers at day 21 | Draft the reminder message | Give you the checklist to schedule it in Shopify Email or Flow',
  'action.cod_otp.run': 'Turn on',
  'action.cod_otp.done': 'Checklist ready',
  'action.cod_otp.steps':
    'List the checkout or shipping-partner settings to change | Estimate the drop in undelivered orders | Wait for you to confirm it is on',
  'action.prepaid_nudge.run': 'Turn on offer',
  'action.prepaid_nudge.done': 'Offer live',
  'action.prepaid_nudge.steps':
    'Create the PREPAID20 code in Shopify | Draft the checkout banner | Give you the checklist to limit it to prepaid orders',
  'action.listing_update.run': 'Update listing',
  'action.listing_update.done': 'Listing copy ready',
  'action.listing_update.steps':
    'Write the new title, bullets and image text for each platform | Save them to a Doc in Drive Outbox | Link each listing editor',
  'action.amazon_ads_bulk.run': 'Apply bids',
  'action.amazon_ads_bulk.done': 'Bulk sheet ready',
  'action.amazon_ads_bulk.steps':
    'Build the Amazon Ads bulk sheet with the changes | Save it to Drive Outbox | Link Bulk operations in Amazon Ads',
  'action.geo_test.run': 'Launch test',
  'action.geo_test.done': 'Test planned',
  'action.geo_test.steps':
    'Pick test and control cities and the duration | Export the location exclusions for each platform | Add start, mid-check and readout dates to the calendar | Track it daily and read it out',
  'action.price_alert.run': 'Set alert',
  'action.price_alert.done': 'Alert set',
  'action.price_alert.steps':
    'Add a rule: tell you when {rival} cuts its price again | Check it at every sync | Notify you on Slack and in Drishti',
  'action.price_rule.run': 'Apply rule',
  'action.price_rule.done': 'Rule on',
  'action.price_rule.steps': 'Add a rule that stops price-match suggestions for {rival} | Keep it on for 4 weeks',
  'action.watchlist_add.run': 'Add to watchlist',
  'action.watchlist_add.done': 'Added',
  'action.watchlist_add.steps': 'Add the rows to the Watchlist tab | Include them in the next capture',
  'action.brief.run': 'Send brief',
  'action.brief.done': 'Brief sent',
  'action.brief.steps':
    'Write the brief with the numbers and quotes filled in | Save it to Drive Outbox | Assign review to the owner',
  'action.campaign_schedule.run': 'Schedule',
  'action.campaign_schedule.done': 'Scheduled',
  'action.campaign_schedule.steps':
    'Build the audience file and the brief | Add the send date to the calendar | Measure segment revenue in the window',
  'action.creator_budget.run': 'Approve budget',
  'action.creator_budget.done': 'Creator plan ready',
  'action.creator_budget.steps':
    'Build the creator plan: cities, budget and briefs | Add the planned posts to the Creators tab | Measure regional lift',
  'action.flipkart_claim.run': 'File claim',
  'action.flipkart_claim.done': 'Claim list ready',
  'action.flipkart_claim.steps':
    'List the order IDs, dates and reasons | Give you the steps to file it in Seller Hub | Record the amount reimbursed when you confirm',
  'action.packaging_request.run': 'Raise request',
  'action.packaging_request.done': 'Request raised',
  'action.packaging_request.steps': 'Send the request to the ops owner with the evidence | Track delivery complaints',
  'action.nykaa_request.run': 'Request slot',
  'action.nykaa_request.done': 'Email drafted',
  'action.nykaa_request.steps':
    'Draft the email to your Nykaa key account manager | Attach the bundle listing file | Measure Nykaa revenue in the sale window',
  'action.source_reminder.run': 'Set reminder',
  'action.source_reminder.done': 'Reminder set',
  'action.source_reminder.steps': 'Send a 9 am reminder on Slack and in Drishti every day | Stop when {source} arrives',
  'action.request_files.run': 'Request missing files',
  'action.request_files.done': 'Requests sent',
  'action.request_files.steps': 'Send one reminder per late source | Stop each when its file arrives',
  'action.upload_file.run': 'Upload files',
  'action.upload_file.done': 'Uploaded',
  'action.upload_file.steps':
    'Upload the file to your Drive Inbox | Start a sync | Show what it was parsed as and how many rows',
  'action.sync_now.run': 'Sync now',
  'action.sync_now.done': 'Sync started',
  'action.sync_now.steps': 'Start a sync | Show its progress | Update every screen when it finishes',
  'action.assign.run': 'Assign',
  'action.assign.done': 'Assigned',
  'action.assign.steps': 'Set the owner and due date | Notify them on Slack, calendar and in Drishti',
} as const;
