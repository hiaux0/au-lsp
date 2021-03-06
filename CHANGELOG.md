# 2.0.0 (2021-02-26)


### Bug Fixes

* fix types after changes ([341abaf](https://github.com/aurelia/vscode-extension/commit/341abaf1d9f7b55951d7dc8fc08b3385c2ed4258))
* ***.types:** fix type error ([7ec2cc9](https://github.com/aurelia/vscode-extension/commit/7ec2cc9d04181bd7c46107cfd7f6af95a53ca128))
* **completion:** return if nothing found, remove if-guard for debug ([81cd8ad](https://github.com/aurelia/vscode-extension/commit/81cd8ad1ae8869102f1f3e91ec12b4078364ea93))
* **completion:** return just one class statement ([5d3269a](https://github.com/aurelia/vscode-extension/commit/5d3269a1089985c5305c8ae4f339b9646cd189ee))
* **completions:** imports and lint ([90f7c4f](https://github.com/aurelia/vscode-extension/commit/90f7c4fc8fc73b16ec906ea32ac113ba31f5d9e4))
* **completions:** pass all parsing result ([7b7fd1a](https://github.com/aurelia/vscode-extension/commit/7b7fd1a1f3110564b96eafc6a191794c0f15609e))
* **diagram:** correct hierarchy call (before `this.subscribe` also matched `this.subscribers`) ([007e913](https://github.com/aurelia/vscode-extension/commit/007e913a5dac5bcdeb8c102aa8994201bb4e3891))
* **diagram:** Replace new line in comments, else diagram breaks (evaluates new comment line as class member) ([9bd49c4](https://github.com/aurelia/vscode-extension/commit/9bd49c4fa76b786117da654226a17188fe052013))
* **diagram:** variables now correct index ([34147f2](https://github.com/aurelia/vscode-extension/commit/34147f256380d8813c3c9b479992ae74078ea0bf))
* **e2e:** need to include all server packages in client as well, since tests are build into /client/out/client/test ... ([3d6d450](https://github.com/aurelia/vscode-extension/commit/3d6d450161e3d9c0af4ab43546ce253df6db64de))
* **embedded:** account for "file://" ([d1136b2](https://github.com/aurelia/vscode-extension/commit/d1136b27cad07e435ce7c0d7d8d6b3f8300a9fbb))
* **embedded:** add regionValue to textInterpolation ([b39fa31](https://github.com/aurelia/vscode-extension/commit/b39fa31a3990cb81cce481c7fa65acf105fb0db4))
* **embedded:** default html mode ([71692bf](https://github.com/aurelia/vscode-extension/commit/71692bf17290c88bd75d97615c4c31740a34f3a4))
* **embedded:** named group refac 52c7c0498 ([956fa36](https://github.com/aurelia/vscode-extension/commit/956fa361b3c20140a1036cc44a27ddf95ba1cf70))
* **embedded:** type for `doHover` ([20e3208](https://github.com/aurelia/vscode-extension/commit/20e32084467e9955ef8c2c242c4e6ac6a2a5362e))
* **package.json:** correct path for client ([e7a2b93](https://github.com/aurelia/vscode-extension/commit/e7a2b93654b33e254d45807f357f6009351e4ba6))
* **server.config:** import reflect-metadata ([9384b7f](https://github.com/aurelia/vscode-extension/commit/9384b7f2fe86d85bbd935ed5f51b5340f574d558))
* **test:** mocha api ([7fa21fb](https://github.com/aurelia/vscode-extension/commit/7fa21fbf0303590231e638a1409fb0cd2e6cdf4c))
* **test.embedded:** api change ([b1f754d](https://github.com/aurelia/vscode-extension/commit/b1f754d94fcf276e5074419b205f6d2d15930dbd))
* **tsconfig:** json format ([012e436](https://github.com/aurelia/vscode-extension/commit/012e436135b2743a8fc31ad659eda17e9cf38bbf))
* **viewModel:** parse components without decorator ([bdc1f79](https://github.com/aurelia/vscode-extension/commit/bdc1f799af2a541869474b8e41d52562b1f4d232))
* **viewModel:** skip .d.ts files ([471f3b3](https://github.com/aurelia/vscode-extension/commit/471f3b3f618e1539daea9958625055cd512d2649))
* **viewModel.auComp:** only parse Au classes ([ef1a495](https://github.com/aurelia/vscode-extension/commit/ef1a495111896627b5d178ff42398311bf445097))
* **viewModel.aup:** make classMembers optional (Eg. value converter ([372e4bb](https://github.com/aurelia/vscode-extension/commit/372e4bba403a5781dae25391f1b2be3b9ed4c501))
* **viewModel.valueConverter:** check for VC ([a042e8d](https://github.com/aurelia/vscode-extension/commit/a042e8d233528d62929fa006aa42de5eccc7bb8c))
* **virtual:** if-guard for quickinfo doc ([a532e20](https://github.com/aurelia/vscode-extension/commit/a532e20cbdb5c1e59a13b79b48c3ab415512cdcd))
* **virtualCompletion:** multiple text interpolation in one line ([c97b213](https://github.com/aurelia/vscode-extension/commit/c97b213819bfc2ee333082503968a4042f88e7c2))


### Features

* **aurelia:** add componentList ([23f8b03](https://github.com/aurelia/vscode-extension/commit/23f8b03cc614cf17171fb02ea33c75f56f560654))
* **completion:** class members ([54de82c](https://github.com/aurelia/vscode-extension/commit/54de82c2bacf69bb72ff7aed8bdff0a0212cbf97))
* **completion:** connect componentMap to server.ts ([f559fe1](https://github.com/aurelia/vscode-extension/commit/f559fe11d5327fd5882a3c5571b196e17e05fecb))
* **completion:** connect to server ([3abde3a](https://github.com/aurelia/vscode-extension/commit/3abde3a32d0469cda29e8714190a876e5bf43099))
* **completion:** differentiate bindables ([5b9ca49](https://github.com/aurelia/vscode-extension/commit/5b9ca497ec33b8aab82dcdfc086c78a2f926a325))
* **completion:** for class name (as <my-compo>) ([489312b](https://github.com/aurelia/vscode-extension/commit/489312b9aee3befa4ab555ccb551b0b39f2c14a5))
* **completion:** init component map ([9b8dd1a](https://github.com/aurelia/vscode-extension/commit/9b8dd1a46e866d178d682a5cc3018a26f6e741d9))
* **completion:** init watch program ([daac639](https://github.com/aurelia/vscode-extension/commit/daac6392901b1ed7b54da4f2e09b3ec493eae7c9))
* **completion:** optional param for e2e tests ([9ff0cc5](https://github.com/aurelia/vscode-extension/commit/9ff0cc56ff6549bcc7fa205da99bc724e55585d8))
* **completion:** readd component completion (aka class declaration) ([ae0c908](https://github.com/aurelia/vscode-extension/commit/ae0c9088ca14f9e0a4616599232e65b52f1743b0))
* **completions:** differentiate bindables ([e722d7e](https://github.com/aurelia/vscode-extension/commit/e722d7ef9eba888c594fe185df08211b085f1033))
* **completions:** improve via triggercharacter ([57402a3](https://github.com/aurelia/vscode-extension/commit/57402a31699359c78526cbff904f97272bfe5a7e))
* **completions:** support completions of imported types (limiation: ([59fc0c7](https://github.com/aurelia/vscode-extension/commit/59fc0c7842d35256ec1e990c56ca8cd0e6017aea))
* **Debug.Logging:** add command to log componentMap ([3e16fd2](https://github.com/aurelia/vscode-extension/commit/3e16fd22b7654458513818acc0a7ce9e7bdeb202))
* **depMap:** command ([9c6bb6c](https://github.com/aurelia/vscode-extension/commit/9c6bb6c41122576a0b2b108a0862f18f9ed26c57))
* **diagram:** add dark theme ([afbf057](https://github.com/aurelia/vscode-extension/commit/afbf057698a2801b72f07b1b83ebaf41299c21ba))
* **diagram:** add markdown mermaid to manually copy and paste ([355d578](https://github.com/aurelia/vscode-extension/commit/355d57855567021bf52f141ae3d9f41757baba80))
* **diagram:** assemble string (in mermaid-js md style) ([a536274](https://github.com/aurelia/vscode-extension/commit/a5362743b0b52113626014f21652072acb80284c))
* **diagram:** call hierarchy (outgoing calls) ([acea08e](https://github.com/aurelia/vscode-extension/commit/acea08e233a279b4779df221991f42da7392bfa2))
* **diagram:** mmd formatting (space between dependencies) ([3b24a34](https://github.com/aurelia/vscode-extension/commit/3b24a34740d5de0b8d894237fc6182d2037fa555))
* **diagram:** open diagram for acitve editor ([ce2f922](https://github.com/aurelia/vscode-extension/commit/ce2f9228001583a40de0605bfedc0cfb5851207e))
* **diagram:** parse class members with ([6dd4555](https://github.com/aurelia/vscode-extension/commit/6dd455507ac54f7fc06f07dc515f036cc8b72726))
* **diagram:** preview as webview (1/3) ([c3a3410](https://github.com/aurelia/vscode-extension/commit/c3a34107663f793d842b41013160b03b5cfb6ef0))
* **diagram:** preview as webview (2/3) include lib from https://github.com/mermaidjs/mermaid-webpack-demo with updated version 7.x -> 8.x ([feed390](https://github.com/aurelia/vscode-extension/commit/feed390f16b29f02055eff9b10ae07854791a432))
* **diagram:** preview as webview (3/3) ([a73c71b](https://github.com/aurelia/vscode-extension/commit/a73c71b375568d40af7a010afb15a5cca319bc4e))
* **diagram:** remove comments ([3e35fec](https://github.com/aurelia/vscode-extension/commit/3e35fec17754d10391302f0b4705fde64b3c256c))
* **diagram:** rename (because, outgoing calls can also have variables) ([7c0be9e](https://github.com/aurelia/vscode-extension/commit/7c0be9e6d119bba8f8874a10f73664ca4c44f438))
* **diagram:** types: array -> obj to find easier ([7acd75f](https://github.com/aurelia/vscode-extension/commit/7acd75fdff60c42a702842d0f855231338fc72ef))
* **embedded:** connect ([b49b5f1](https://github.com/aurelia/vscode-extension/commit/b49b5f154559b51111f82e184e5be10cb6f4af39))
* **embedded:** copy paste from official repo ([3d35e8b](https://github.com/aurelia/vscode-extension/commit/3d35e8b6a51c5332a1fe2ce5f3c91e0d64bf95b8))
* **embedded:** different completions for 'aurelia'-region ([5e1074b](https://github.com/aurelia/vscode-extension/commit/5e1074bcab1875bd6d417c5b9b8de343d4b7c302))
* **embedded:** rename ([bd63931](https://github.com/aurelia/vscode-extension/commit/bd6393122f736f0e1248af9504f73debd3b708a5))
* **embedded:** support v2 template import ([822c327](https://github.com/aurelia/vscode-extension/commit/822c327056d01f023172e271a71d2603ffab98c0))
* **fixtures:** less class members ([607981b](https://github.com/aurelia/vscode-extension/commit/607981be8853ba04b151a6d7174fab9b5a6dc93e))
* **logging:** update log name ([a60caf8](https://github.com/aurelia/vscode-extension/commit/a60caf84d1a84e113dcba356cad477ba270994aa))
* **program:** convenience get and set for projects/program ([59beae1](https://github.com/aurelia/vscode-extension/commit/59beae17875a5346140ae310b27a6f97a2731bd6))
* **program:** filter aurelia sourceFiles ([2b8d2f7](https://github.com/aurelia/vscode-extension/commit/2b8d2f7d3c610c6ee2073c0594b74a3fc0dedcf8))
* **relatedFiles:** init (copied over from v1) ([#2](https://github.com/aurelia/vscode-extension/issues/2)) ([d6888b9](https://github.com/aurelia/vscode-extension/commit/d6888b91ba75252283bc91658a3d27a9c5d310e4))
* **settings:** allow default ([4554178](https://github.com/aurelia/vscode-extension/commit/4554178c2b6fb9b12de8761c72841fb09fafb57d))
* **settings:** extra settings (not sure if needed) ([cfe0c42](https://github.com/aurelia/vscode-extension/commit/cfe0c42f789b0c97e7ab66c3a7b7958550ece7f8))
* **syntax:** add Aurelia Template Syntax highlighting ([c0e8b30](https://github.com/aurelia/vscode-extension/commit/c0e8b30673be239c978dc9e8ed99fcdb0f4a0bb6))
* **viewModel:** add class members to componentList ([719a1a7](https://github.com/aurelia/vscode-extension/commit/719a1a7ad804e19ae9779090608211e437ffba61))
* **viewModel:** parse v2 template prop ([900e791](https://github.com/aurelia/vscode-extension/commit/900e7911b20b22616ab8d8bbc49ec5799b31e591))
* **viewModel:** skip d.ts files ([7841add](https://github.com/aurelia/vscode-extension/commit/7841add4504b37f678374f65e0d10ef24cd7d1b3))
* **viewModel.aup:** add initComponentList ([a0ed1bd](https://github.com/aurelia/vscode-extension/commit/a0ed1bd07d0232428dffcc3300723057bc88098e))
* **viewModel.componentList:** add templateImportPath ([29609b5](https://github.com/aurelia/vscode-extension/commit/29609b5df3a4143bf9a3cc0ca6db78ac4fab10c0))
* **virtual:** add typeguard ([d51ca82](https://github.com/aurelia/vscode-extension/commit/d51ca825dd680a15006c488cd5f705ae2b0d76fd))



