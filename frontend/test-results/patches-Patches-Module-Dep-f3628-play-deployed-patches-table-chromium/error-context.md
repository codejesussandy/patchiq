# Page snapshot

```yaml
- generic [ref=e3]:
  - img [ref=e5]
  - generic [ref=e10]:
    - heading "Welcome to InventIQ" [level=2] [ref=e11]
    - generic [ref=e12]: Enter your details to sign in your account
    - generic [ref=e13]:
      - generic [ref=e15]:
        - generic "Email" [ref=e17]
        - textbox "Email" [ref=e21]:
          - /placeholder: sharma@mail.com
          - text: admin@patchiq.io
      - generic [ref=e23]:
        - generic "Password" [ref=e25]
        - generic [ref=e29]:
          - textbox "Password" [ref=e30]: admin123
          - img "eye-invisible" [ref=e32] [cursor=pointer]:
            - img [ref=e33]
      - generic [ref=e36]: Forgot password
      - button "loading Log in" [active] [ref=e42] [cursor=pointer]:
        - generic:
          - img "loading"
        - generic [ref=e43]: Log in
```