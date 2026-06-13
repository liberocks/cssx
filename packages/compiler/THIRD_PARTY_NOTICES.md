# Third-Party Reference Notice

CSSX previously used local, compiler-only reference snapshots while its
first-party candidate parser, semantic composition model, theme parser, and
utility registry were implemented. Those snapshots are no longer included in
this package and no active CSSX source imports their code.

The following MIT-licensed reference snapshots informed compatibility research
and the historical reference suite:

| Reference area                | Revision                                   | License |
| ----------------------------- | ------------------------------------------ | ------- |
| Utility compiler              | `90f8ff41c8e2a4d17bc76921e23e9d672123da76` | MIT     |
| Conflict classifier           | `bceabfd95eab05553d15c5368b2684de697a84eb` | MIT     |
| Transformation infrastructure | `a48cbbc4d41f5da3a464f884f3fce755814a430a` | MIT     |

CSSX publishes independently written source. This notice records the
compatibility baseline and must be retained while the corresponding behavior
is documented or tested.
