# Fulfillment assistant

Prepares a Temu ordering handoff for paid ZA Supplier Hub orders.

This is intentionally assisted fulfillment. It does not pay on Temu, submit
orders, bypass security verification, or mark hub orders fulfilled. The operator
must review the Temu product, selected variant, shipping address, final price,
delivery method, and payment before placing the order.

## Preflight

```bash
python3 scripts/fulfillment/temu_order_assistant.py --check-source-coverage
```

The assistant needs `products.source_id` to build source Temu links. If source
coverage is zero, existing orders cannot be traced back to Temu automatically.

## Prepare the latest processing order

```bash
python3 scripts/fulfillment/temu_order_assistant.py --limit 1
```

Outputs a JSON file and an HTML handoff pack under:

```text
scripts/fulfillment/.work/
```

## Prepare a specific order

```bash
python3 scripts/fulfillment/temu_order_assistant.py --order-id <hub-order-uuid>
python3 scripts/fulfillment/temu_order_assistant.py --shopify-order-id <shopify-order-id>
```

Add `--open` to open the HTML pack and Temu product links in the default browser.

## Operator flow

1. Open the generated HTML pack.
2. Open each Temu product link.
3. Select the matching variant from `variant_selection`.
4. Add the required quantity to cart.
5. Enter the customer's shipping details.
6. Stop and manually review final price, stock, delivery, and address.
7. Pay only after manual review.
