# gasless-transaction-backend

Backend microservice for enabling/disabling MetaTransactions on the users depending on cretain logic.

## Endpoints:
- [GET] /gaslessCheck: Loops all users from GRAPHQL checks and add/remove metatx.
- [POST] /gasless: Manually checks users balance and add/remove metatx.
