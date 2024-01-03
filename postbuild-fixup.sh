#!/bin/sh
cat >dist/cjs/package.json <<!EOF
{
    "type": "commonjs"
}
!EOF

cat >dist/mjs/package.json <<!EOF
{
    "type": "module"
}
!EOF

cp src/tjbot.default.toml dist/cjs
cp src/tjbot.default.toml dist/mjs
