# crystalize-crystal
## core app component of crystal

The crystal is the central component of crystalize. Crystal acts like a Group
with extended funtionality. This extended functionality takes route definitions
from it and all of its subgroups and compiles a very fast listener function.
This crystal does the littlest-possible work to dispatch the requests, leaving
the majority of the workload to middleware.
