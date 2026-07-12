# GitHub backend

An abstraction layer between the CMS and a proxied version of [Github](https://docs.github.com/en/rest).

## Code structure

`Implementation` - wraps [Github Backend](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-backend-github/README.md) for a proxied version of GitHub, and provides `authComponent()`.

`authComponent()` - returns the [`PKCEAuthenticationPage`](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-ui-auth/README.md) component from `decap-cms-ui-auth`, which uses [lib-auth](https://github.com/decaporg/decap-cms/tree/main/packages/decap-cms-lib-auth/README.md)'s `PkceAuthenticator` to create an AWS Cognito compatible generic Authentication page supporting PKCE.
