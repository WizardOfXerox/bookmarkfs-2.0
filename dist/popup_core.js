function e(e, t, r, n) {
  Object.defineProperty(e, t, {
    get: r,
    set: n,
    enumerable: !0,
    configurable: !0,
  });
}
function t(e) {
  return e && e.__esModule ? e.default : e;
}
var r =
    "undefined" != typeof globalThis
      ? globalThis
      : "undefined" != typeof self
        ? self
        : "undefined" != typeof window
          ? window
          : "undefined" != typeof global
            ? global
            : {},
  n = {},
  o = {},
  i = r.parcelRequire60cc;
(null == i &&
  (((i = function (e) {
    if (e in n) return n[e].exports;
    if (e in o) {
      var t = o[e];
      delete o[e];
      var r = { id: e, exports: {} };
      return ((n[e] = r), t.call(r.exports, r, r.exports), r.exports);
    }
    var i = new Error("Cannot find module '" + e + "'");
    throw ((i.code = "MODULE_NOT_FOUND"), i);
  }).register = function (e, t) {
    o[e] = t;
  }),
  (r.parcelRequire60cc = i)),
  i.register("2xkva", function (t, r) {
    e(t.exports, "default", () => l);
    var n = i("4Bfs2"),
      o = i("7bYdL");
    const a = { ERROR: 40, WARN: 30, INFO: 20, DEBUG: 10, NOTSET: 0 };
    let u = a.INFO;
    try {
      const e = window.localStorage.getItem("__fploglevel");
      if (e && /^\d+$/.test(e)) {
        const t = parseInt(e, 10);
        u = t;
      }
    } catch (e) {}
    const s = (e, t, r) => {
        if (!(e < u)) {
          (r && console[r]) ||
            (r =
              e <= a.DEBUG
                ? "log"
                : e <= a.INFO
                  ? "info"
                  : e <= a.WARN
                    ? "warn"
                    : "error");
          try {
            (console[r] || console.log).apply(console, t);
          } catch (e) {}
        }
      },
      c = function (...e) {
        s(a.DEBUG, e);
      };
    var l = c;
    ((c.debug = c),
      (c.info = function (...e) {
        s(a.INFO, e);
      }),
      (c.warn = function (...e) {
        s(a.WARN, e);
      }),
      (c.error = function (...e) {
        s(a.ERROR, e);
      }),
      (c.group = function (...e) {
        s(a.DEBUG, e, "group");
      }),
      (c.groupCollapsed = function (...e) {
        s(a.DEBUG, e, "groupCollapsed");
      }),
      (c.groupEnd = function (...e) {
        s(a.DEBUG, e, "groupEnd");
      }),
      (c.j = function (e) {
        if (void 0 === e) return "undefined";
        try {
          return JSON.stringify(e);
        } catch (t) {
          return e;
        }
      }));
    const f = {
      gray: {
        bg: o.TAILWIND_COLORS["gray-600"],
        text: "#fff",
        innerText: o.TAILWIND_COLORS["gray-800"],
      },
      red: {
        bg: o.TAILWIND_COLORS["red-600"],
        text: "#fff",
        innerText: o.TAILWIND_COLORS["red-800"],
      },
      pink: {
        bg: o.TAILWIND_COLORS["pink-600"],
        text: "#fff",
        innerText: o.TAILWIND_COLORS["pink-800"],
      },
      yellow: {
        bg: o.TAILWIND_COLORS["yellow-600"],
        text: "#fff",
        innerText: o.TAILWIND_COLORS["yellow-800"],
      },
      green: {
        bg: o.TAILWIND_COLORS["green-600"],
        text: "#fff",
        innerText: o.TAILWIND_COLORS["green-800"],
      },
      blue: {
        bg: o.TAILWIND_COLORS["blue-600"],
        text: "#fff",
        innerText: o.TAILWIND_COLORS["blue-800"],
      },
      purple: {
        bg: o.TAILWIND_COLORS["purple-600"],
        text: "#fff",
        innerText: o.TAILWIND_COLORS["purple-800"],
      },
    };
    const p = (e) => (/^#[A-Fa-f0-9]*$/.test(e) ? e : CSS.escape(e));
    c.x = function (e, t, r, o) {
      let i;
      "string" == typeof r
        ? ((i = f[r]), (0, n.isPresent)(o) && (i = { ...i, ...o }))
        : (i = r || {});
      const { bg: c, text: l, innerText: h, level: d = a.DEBUG } = i;
      if (d < u) return;
      let y = "";
      (c && (y += `background-color:${p(c)};`),
        l && (y += `color:${p(l)};`),
        s(d, [`%c${e}`, y], i.collapsed ? "groupCollapsed" : "group"));
      const g = `font-weight:bold;${(h && `color:${p(h)};`) || ""}`;
      (Object.entries(t).forEach(([e, t]) => {
        s(d, [`%c${e}`, g, t]);
      }),
        s(d, [], "groupEnd"));
    };
  }),
  i.register("4Bfs2", function (t, r) {
    (e(t.exports, "isPresent", () => n), e(t.exports, "isBlank", () => o));
    const n = (e) => null != e,
      o = (e) => null == e;
  }),
  i.register("7bYdL", function (t, r) {
    e(t.exports, "TAILWIND_COLORS", () => n);
    const n = {
      "red-50": "#FDF2F2",
      "red-100": "#FDE8E8",
      "red-200": "#FBD5D5",
      "red-300": "#F8B4B4",
      "red-400": "#F98080",
      "red-500": "#F05252",
      "red-600": "#E02424",
      "red-700": "#C81E1E",
      "red-800": "#9B1C1C",
      "red-900": "#771D1D",
      "pink-100": "#FCE8F3",
      "pink-500": "#E74694",
      "pink-600": "#D61F69",
      "pink-700": "#BF125D",
      "pink-800": "#99154B",
      "pink-900": "#751A3D",
      "gray-50": "#F9FAFB",
      "gray-100": "#F3F4F6",
      "gray-200": "#E5E7EB",
      "gray-300": "#D1D5DB",
      "gray-400": "#9CA3AF",
      "gray-500": "#6B7280",
      "gray-600": "#4B5563",
      "gray-700": "#374151",
      "gray-800": "#1F2A37",
      "gray-900": "#111928",
      "blue-50": "#EBF5FF",
      "blue-100": "#E1EFFE",
      "blue-200": "#C3DDFD",
      "blue-300": "#A4CAFE",
      "blue-400": "#76A9FA",
      "blue-500": "#3F83F8",
      "blue-600": "#1C64F2",
      "blue-700": "#1A56DB",
      "blue-800": "#1E429F",
      "blue-900": "#233876",
      "indigo-100": "#E5EDFF",
      "indigo-500": "#6875F5",
      "indigo-600": "#5850EC",
      "green-50": "#F3FAF7",
      "green-100": "#DEF7EC",
      "green-200": "#BCF0DA",
      "green-300": "#84E1BC",
      "green-400": "#31C48D",
      "green-500": "#0E9F6E",
      "green-600": "#057A55",
      "green-700": "#046C4E",
      "green-800": "#03543F",
      "green-900": "#014737",
      "yellow-50": "#FDFDEA",
      "yellow-100": "#FDF6B2",
      "yellow-200": "#FCE96A",
      "yellow-300": "#FACA15",
      "yellow-400": "#E3A008",
      "yellow-500": "#C27803",
      "yellow-600": "#9F580A",
      "yellow-700": "#8E4B10",
      "yellow-800": "#723B13",
      "yellow-900": "#633112",
      "purple-50": "#F6F5FF",
      "purple-100": "#EDEBFE",
      "purple-200": "#DCD7FE",
      "purple-300": "#CABFFD",
      "purple-400": "#AC94FA",
      "purple-500": "#9061F9",
      "purple-600": "#7E3AF2",
      "purple-700": "#6C2BD9",
      "purple-800": "#5521B5",
      "purple-900": "#4A1D96",
    };
  }),
  i.register("mG6c6", function (t, r) {
    e(t.exports, "default", () => a);
    var n = i("2xkva");
    const o = (function () {
      window.requestFileSystem =
        window.requestFileSystem || window.webkitRequestFileSystem;
      let e = chrome.runtime.getURL("/"),
        t = {
          absPath: (t, r) =>
            `filesystem:${e}${r ? "temporary" : "persistent"}${t}`,
          requestFs: function (e, t) {
            (void 0 === t && "boolean" == typeof e && ((t = e), (e = null)),
              (e = e || 1048576));
            let r = !0 === t ? window.TEMPORARY : window.PERSISTENT;
            return new Promise((t, n) => {
              window.requestFileSystem(
                r,
                e,
                (e) => t(e),
                (e) => n(e),
              );
            });
          },
          requestFsError: function (e) {
            n.default.error("ERROR requesting filesystem", e);
            showError(
              "Unable to access filesystem",
              "Something went wrong accessing the filesystem. Check your browser settings.",
              !0,
              !0,
            );
          },
          getDirectory: function (e, t, r) {
            let n = void 0 === e.root ? e : e.root;
            return new Promise((e, o) => {
              n.getDirectory(
                t,
                r,
                (t) => e(t),
                (e) => o(e),
              );
            });
          },
          getFile: function (e, t, r) {
            let n = void 0 === e.root ? e : e.root;
            return new Promise((e, o) => {
              n.getFile(
                t,
                r,
                (t) => e(t),
                (e) => o(e),
              );
            });
          },
          getFiles: function (e, r, o) {
            return Promise.all(
              r.map((r) => {
                let i = t.getFile(e, r);
                return (
                  !0 === o &&
                    (i = i.catch((e) => {
                      n.default.error("Ignoring not found file:", e);
                    })),
                  i
                );
              }),
            ).then((e) => e.filter((e) => void 0 !== e));
          },
          writeFile: function (e, t) {
            return new Promise((r, n) => {
              e.createWriter(function (o) {
                ((o.onwriteend = () => r(e)),
                  (o.onerror = (e) => n(e)),
                  o.write(t));
              }, n);
            });
          },
          moveFile: function (e, t, r) {
            return new Promise((n, o) => {
              e.moveTo(t, r, (e) => n(e), o);
            });
          },
          removeFile: function (e) {
            return new Promise((t, r) => {
              e.remove(
                () => t(),
                (e) => r(e),
              );
            });
          },
          lookupFiles: function (e, r) {
            let n = void 0 === e.root ? e : e.root;
            return new Promise((e, o) => {
              let i = n.createReader(),
                a = [];
              !(function n() {
                i.readEntries((o) => {
                  var i;
                  o.length
                    ? ((a = a.concat(
                        ((i = o), Array.prototype.slice.call(i || [], 0)),
                      )),
                      n())
                    : (a.sort(), e(!0 === r ? a : t.filterToFiles(a)));
                }, o);
              })();
            });
          },
          filterToFiles: function (e) {
            return e.filter((e) => e.isFile);
          },
          loadMetadata: function (e) {
            let r = e.map((e) => t.getMetadata(e));
            return Promise.all(r);
          },
          getMetadata: function (e) {
            return new Promise((t, r) => {
              e.getMetadata(
                function (r) {
                  ((e.metadata = r), t(e));
                },
                function () {
                  (n.default.error("error reading metadata", arguments),
                    (e.metadata = null),
                    t(e));
                },
              );
            });
          },
          rmFiles: function (e, t) {
            return new Promise((r, o) => {
              let i = e.length,
                a = [],
                u = [],
                s = { succeeded: a, failed: u };
              function c(e, n, o) {
                ((o ? a : u).push(e),
                  t(e, n, i, o),
                  a.length + u.length === i && r(s));
              }
              (0 === i && r(s),
                e.forEach(function (e, t) {
                  ((0, n.default)("FILE", e, t),
                    e.isFile
                      ? e.remove(
                          () => c(e, t, !0),
                          () => c(e, t, !1),
                        )
                      : c(e, t, !1));
                }));
            });
          },
          clearAllFiles: function (e, r) {
            return new Promise((o, i) => {
              ((r = r || function () {}),
                t
                  .lookupFiles(e)
                  .then((e) => t.rmFiles(e))
                  .catch((e) => {
                    let t = (function (e) {
                      let t = "";
                      switch (e.code) {
                        case FileError.QUOTA_EXCEEDED_ERR:
                          t = "QUOTA_EXCEEDED_ERR";
                          break;
                        case FileError.NOT_FOUND_ERR:
                          t = "NOT_FOUND_ERR";
                          break;
                        case FileError.SECURITY_ERR:
                          t = "SECURITY_ERR";
                          break;
                        case FileError.INVALID_MODIFICATION_ERR:
                          t = "INVALID_MODIFICATION_ERR";
                          break;
                        case FileError.INVALID_STATE_ERR:
                          t = "INVALID_STATE_ERR";
                          break;
                        default:
                          t = "Unknown Error";
                      }
                      return t;
                    })(e);
                    (n.default.error("Encountered error", t), i(e));
                  }));
            });
          },
          _listeners: [],
          onUpdated: function (e) {
            t._listeners.push(e);
          },
          triggerUpdated: function (e) {
            ((e = e || {}), t._listeners.forEach((t) => t(e)));
          },
        };
      return t;
    })();
    window._FSAPI = o;
    var a = o;
  }),
  i.register("alm1K", function (t, r) {
    (e(t.exports, "serialMap", () => n),
      e(t.exports, "sleep", () => o),
      e(t.exports, "timeoutWrap", () => a),
      e(t.exports, "simpleLoadImage", () => u),
      e(t.exports, "loadImage", () => s));
    const n = i("hvGrI").serialMap,
      o = (e, t) =>
        new Promise((r) => {
          window.setTimeout(() => r(t), e);
        }),
      a = (e, t, r, n) =>
        new Promise((o, i) => {
          let a;
          (t &&
            (a = window.setTimeout(() => {
              let e = `Promise timed out after ${t}ms`;
              r && (e += " " + r);
              let o = new Error(e);
              if (((o.name = "PromiseTimeout"), n)) {
                !1 === n(o, t) && i(o);
              } else i(o);
            }, t)),
            e
              .then((e) => {
                (window.clearTimeout(a), o(e));
              })
              .catch(i));
        }),
      u = (e) =>
        new Promise((t, r) => {
          const n = new Image();
          ((n.onerror = (e) => r(e)), (n.onload = () => t(n)), (n.src = e));
        }),
      s = (e) =>
        u(e).then((t) => ({
          img: t,
          src: e,
          width: t.width,
          height: t.height,
        }));
  }),
  i.register("hvGrI", function (t, r) {
    (e(t.exports, "loadImage", () => n), e(t.exports, "serialMap", () => o));
    const n = (e) =>
        new Promise((t, r) => {
          let n = new Image();
          ((n.onerror = (e) => r(e)),
            (n.onload = (r) =>
              t({ img: n, src: e, width: n.width, height: n.height })),
            (n.src = e));
        }),
      o = async (e, t) => {
        let r = e.length,
          n = void 0 === t;
        const o = (i, a) => {
          if (i >= r) return a;
          let u;
          return (
            (u = n ? e[i]() : t(e[i])),
            (function (e) {
              return (
                e &&
                "object" == typeof e &&
                e.then &&
                "function" == typeof e.then
              );
            })(u)
              ? u.then((e) => o(i + 1, e))
              : o(i + 1, u)
          );
        };
        return o(0, void 0);
      };
  }),
  i.register("dk7YQ", function (r, n) {
    (e(r.exports, "isFieldHidden", () => l), e(r.exports, "default", () => f));
    var o = i("lSPyV"),
      a = i("yZcwP"),
      u = i("fMrNL");
    const { local: s, sync: c } = u.default,
      l = (e, t, r) =>
        e.hidden && "function" == typeof e.hidden ? e.hidden(t, r) : e.hidden;
    var f = class {
      getField(e) {
        return this.fields[e];
      }
      _key(e) {
        return this.namespace + "." + e;
      }
      _keys(e) {
        if (void 0 === e) throw new Error("Cannot pass `undefined` as `keys`!");
        return ("string" == typeof e && (e = [e]), e.map((e) => this._key(e)));
      }
      _stripKey(e) {
        return e.substring(this.namespace.length + 1);
      }
      async set(e, t) {
        return this.setObj({ [e]: t });
      }
      async setObj(e) {
        let r = {};
        return (
          Object.entries(e).forEach(([e, n]) => {
            const o = this._key(e),
              i = this.namespacedToField[o];
            (t(a).ok(i, `no field found for ${o} (${e})`),
              (r[o] = this._serializeField(i, n)));
          }),
          this.storage.set(r).then(() => {
            Object.assign(this.state, e);
          })
        );
      }
      async get(e) {
        const r = this._keys(e);
        return this.storage.get(r).then((e) => {
          const r = {};
          return (
            Object.entries(e).forEach(([e, n]) => {
              const o = this.namespacedToField[e];
              t(a).ok(o, `no field found for ${e}`);
              const i = this._stripKey(e);
              r[i] = this._deserializeField(o, n);
            }),
            Object.assign(this.state, r),
            r
          );
        });
      }
      async remove(e) {
        const t = "string" == typeof e ? [e] : e,
          r = this._keys(e);
        return this.storage.remove(r).then(() => {
          t.forEach((e) => {
            delete this.state[e];
          });
        });
      }
      async clear() {
        const e = Object.keys(this.fields);
        return this.remove(e);
      }
      async load(e = !1) {
        return (
          (this._loadProm && !0 !== e) || (this._loadProm = this._load()),
          this._loadProm.then(() => Object.assign({}, this.state))
        );
      }
      async _load() {
        const e = Object.keys(this.fields);
        return this.get(e).then(
          (e) => (
            Object.entries(this.fields).forEach(([t, r]) => {
              const n = t;
              if (void 0 === e[n])
                void 0 !== r.default &&
                  (e[n] =
                    "function" == typeof r.default ? r.default() : r.default);
              else if (r.process) {
                const { val: t } = r.process(e[n]);
                e[n] = t;
              }
            }),
            Object.assign(this.state, e),
            e
          ),
        );
      }
      onUpdate(e) {
        this._listeners.push(e);
      }
      _startListening() {
        return (
          !this._listening &&
          ((this._listening = !0),
          chrome.storage.onChanged.addListener((e, t) => {
            if (t === this.areaName) {
              const t = [];
              (Object.entries(e).forEach(([e, r]) => {
                const n = this.namespacedToField[e],
                  o = this.namespacedToKey[e];
                n &&
                  o &&
                  (t.push(o),
                  (this.state[o] = this._deserializeField(n, r.newValue)));
              }),
                t.length && this._listeners.forEach((e) => e(t)));
            }
          }),
          !0)
        );
      }
      _serializeField(e, t) {
        return "json" === e.type ? JSON.stringify(t) : t;
      }
      _deserializeField(e, t) {
        return void 0 === t && void 0 !== e.default
          ? "function" == typeof e.default
            ? e.default()
            : e.default
          : "json" === e.type
            ? JSON.parse(t)
            : t;
      }
      constructor(e, t, r) {
        ((0, o.default)(this, "_listening", !1),
          (this.namespace = e),
          (this.fields = t),
          (this.state = {}),
          (this.storage = !0 === r ? c : s),
          (this.areaName = !0 === r ? "sync" : "local"),
          (this.namespacedToField = {}),
          (this.namespacedToKey = {}));
        let n = !1;
        (Object.entries(this.fields).forEach(([e, t]) => {
          ((n = !0),
            "choice" === t.type &&
              (t.convertedChoices = t.choices.map((e) =>
                "string" == typeof e ? { key: e, display: e } : e,
              )),
            (this.namespacedToField[this._key(e)] = t),
            (this.namespacedToKey[this._key(e)] = e));
        }),
          (this._listeners = []),
          n && this._startListening());
      }
    };
  }),
  i.register("yZcwP", function (e, t) {
    var r = i("69fUi").Buffer,
      n = i("ivIyE"),
      o = i("hj8BX").Stream,
      a = i("dvmmp"),
      u =
        /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;
    function s(e) {
      return e.charAt(0).toUpperCase() + e.slice(1);
    }
    function c(e, t, r, o, i) {
      throw new n.AssertionError({
        message: a.format("%s (%s) is required", e, t),
        actual: void 0 === i ? typeof o : i(o),
        expected: t,
        operator: r || "===",
        stackStartFunction: c.caller,
      });
    }
    function l(e) {
      return Object.prototype.toString.call(e).slice(8, -1);
    }
    function f() {}
    var p = {
      bool: {
        check: function (e) {
          return "boolean" == typeof e;
        },
      },
      func: {
        check: function (e) {
          return "function" == typeof e;
        },
      },
      string: {
        check: function (e) {
          return "string" == typeof e;
        },
      },
      object: {
        check: function (e) {
          return "object" == typeof e && null !== e;
        },
      },
      number: {
        check: function (e) {
          return "number" == typeof e && !isNaN(e);
        },
      },
      finite: {
        check: function (e) {
          return "number" == typeof e && !isNaN(e) && isFinite(e);
        },
      },
      buffer: {
        check: function (e) {
          return r.isBuffer(e);
        },
        operator: "Buffer.isBuffer",
      },
      array: {
        check: function (e) {
          return Array.isArray(e);
        },
        operator: "Array.isArray",
      },
      stream: {
        check: function (e) {
          return e instanceof o;
        },
        operator: "instanceof",
        actual: l,
      },
      date: {
        check: function (e) {
          return e instanceof Date;
        },
        operator: "instanceof",
        actual: l,
      },
      regexp: {
        check: function (e) {
          return e instanceof RegExp;
        },
        operator: "instanceof",
        actual: l,
      },
      uuid: {
        check: function (e) {
          return "string" == typeof e && u.test(e);
        },
        operator: "isUUID",
      },
    };
    e.exports = (function e(t) {
      var r,
        o = Object.keys(p);
      return (
        (r = function (e, t) {
          e || c(t, "true", e);
        }),
        o.forEach(function (e) {
          if (t) r[e] = f;
          else {
            var n = p[e];
            r[e] = function (t, r) {
              n.check(t) || c(r, e, n.operator, t, n.actual);
            };
          }
        }),
        o.forEach(function (e) {
          var n = "optional" + s(e);
          if (t) r[n] = f;
          else {
            var o = p[e];
            r[n] = function (t, r) {
              null != t && (o.check(t) || c(r, e, o.operator, t, o.actual));
            };
          }
        }),
        o.forEach(function (e) {
          var n = "arrayOf" + s(e);
          if (t) r[n] = f;
          else {
            var o = p[e],
              i = "[" + e + "]";
            r[n] = function (e, t) {
              var r;
              for (
                Array.isArray(e) || c(t, i, o.operator, e, o.actual), r = 0;
                r < e.length;
                r++
              )
                o.check(e[r]) || c(t, i, o.operator, e, o.actual);
            };
          }
        }),
        o.forEach(function (e) {
          var n = "optionalArrayOf" + s(e);
          if (t) r[n] = f;
          else {
            var o = p[e],
              i = "[" + e + "]";
            r[n] = function (e, t) {
              var r;
              if (null != e)
                for (
                  Array.isArray(e) || c(t, i, o.operator, e, o.actual), r = 0;
                  r < e.length;
                  r++
                )
                  o.check(e[r]) || c(t, i, o.operator, e, o.actual);
            };
          }
        }),
        Object.keys(n).forEach(function (e) {
          r[e] = "AssertionError" !== e && t ? f : n[e];
        }),
        (r._setExports = e),
        r
      );
    })(void 0);
  }),
  i.register("69fUi", function (t, r) {
    /*!
     * The buffer module from node.js, for the browser.
     *
     * @author   Feross Aboukhadijeh <https://feross.org>
     * @license  MIT
     */ var n, o, a, u;
    (e(
      t.exports,
      "Buffer",
      () => n,
      (e) => (n = e),
    ),
      e(
        t.exports,
        "SlowBuffer",
        () => o,
        (e) => (o = e),
      ),
      e(
        t.exports,
        "INSPECT_MAX_BYTES",
        () => a,
        (e) => (a = e),
      ),
      e(
        t.exports,
        "kMaxLength",
        () => u,
        (e) => (u = e),
      ));
    var s = i("g2A62"),
      c = i("5rhbH"),
      l =
        "function" == typeof Symbol && "function" == typeof Symbol.for
          ? Symbol.for("nodejs.util.inspect.custom")
          : null;
    ((n = h),
      (o = function (e) {
        +e != e && (e = 0);
        return h.alloc(+e);
      }),
      (a = 50));
    var f = 2147483647;
    function p(e) {
      if (e > f)
        throw new RangeError(
          'The value "' + e + '" is invalid for option "size"',
        );
      var t = new Uint8Array(e);
      return (Object.setPrototypeOf(t, h.prototype), t);
    }
    function h(e, t, r) {
      if ("number" == typeof e) {
        if ("string" == typeof t)
          throw new TypeError(
            'The "string" argument must be of type string. Received type number',
          );
        return g(e);
      }
      return d(e, t, r);
    }
    function d(e, t, r) {
      if ("string" == typeof e)
        return (function (e, t) {
          ("string" == typeof t && "" !== t) || (t = "utf8");
          if (!h.isEncoding(t)) throw new TypeError("Unknown encoding: " + t);
          var r = 0 | w(e, t),
            n = p(r),
            o = n.write(e, t);
          o !== r && (n = n.slice(0, o));
          return n;
        })(e, t);
      if (ArrayBuffer.isView(e))
        return (function (e) {
          if (z(e, Uint8Array)) {
            var t = new Uint8Array(e);
            return m(t.buffer, t.byteOffset, t.byteLength);
          }
          return v(e);
        })(e);
      if (null == e)
        throw new TypeError(
          "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " +
            typeof e,
        );
      if (z(e, ArrayBuffer) || (e && z(e.buffer, ArrayBuffer)))
        return m(e, t, r);
      if (
        "undefined" != typeof SharedArrayBuffer &&
        (z(e, SharedArrayBuffer) || (e && z(e.buffer, SharedArrayBuffer)))
      )
        return m(e, t, r);
      if ("number" == typeof e)
        throw new TypeError(
          'The "value" argument must not be of type number. Received type number',
        );
      var n = e.valueOf && e.valueOf();
      if (null != n && n !== e) return h.from(n, t, r);
      var o = (function (e) {
        if (h.isBuffer(e)) {
          var t = 0 | b(e.length),
            r = p(t);
          return (0 === r.length || e.copy(r, 0, 0, t), r);
        }
        if (void 0 !== e.length)
          return "number" != typeof e.length || V(e.length) ? p(0) : v(e);
        if ("Buffer" === e.type && Array.isArray(e.data)) return v(e.data);
      })(e);
      if (o) return o;
      if (
        "undefined" != typeof Symbol &&
        null != Symbol.toPrimitive &&
        "function" == typeof e[Symbol.toPrimitive]
      )
        return h.from(e[Symbol.toPrimitive]("string"), t, r);
      throw new TypeError(
        "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " +
          typeof e,
      );
    }
    function y(e) {
      if ("number" != typeof e)
        throw new TypeError('"size" argument must be of type number');
      if (e < 0)
        throw new RangeError(
          'The value "' + e + '" is invalid for option "size"',
        );
    }
    function g(e) {
      return (y(e), p(e < 0 ? 0 : 0 | b(e)));
    }
    function v(e) {
      for (
        var t = e.length < 0 ? 0 : 0 | b(e.length), r = p(t), n = 0;
        n < t;
        n += 1
      )
        r[n] = 255 & e[n];
      return r;
    }
    function m(e, t, r) {
      if (t < 0 || e.byteLength < t)
        throw new RangeError('"offset" is outside of buffer bounds');
      if (e.byteLength < t + (r || 0))
        throw new RangeError('"length" is outside of buffer bounds');
      var n;
      return (
        (n =
          void 0 === t && void 0 === r
            ? new Uint8Array(e)
            : void 0 === r
              ? new Uint8Array(e, t)
              : new Uint8Array(e, t, r)),
        Object.setPrototypeOf(n, h.prototype),
        n
      );
    }
    function b(e) {
      if (e >= f)
        throw new RangeError(
          "Attempt to allocate Buffer larger than maximum size: 0x" +
            f.toString(16) +
            " bytes",
        );
      return 0 | e;
    }
    function w(e, t) {
      if (h.isBuffer(e)) return e.length;
      if (ArrayBuffer.isView(e) || z(e, ArrayBuffer)) return e.byteLength;
      if ("string" != typeof e)
        throw new TypeError(
          'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' +
            typeof e,
        );
      var r = e.length,
        n = arguments.length > 2 && !0 === arguments[2];
      if (!n && 0 === r) return 0;
      for (var o = !1; ;)
        switch (t) {
          case "ascii":
          case "latin1":
          case "binary":
            return r;
          case "utf8":
          case "utf-8":
            return W(e).length;
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return 2 * r;
          case "hex":
            return r >>> 1;
          case "base64":
            return $(e).length;
          default:
            if (o) return n ? -1 : W(e).length;
            ((t = ("" + t).toLowerCase()), (o = !0));
        }
    }
    function E(e, t, r) {
      var n = !1;
      if (((void 0 === t || t < 0) && (t = 0), t > this.length)) return "";
      if (((void 0 === r || r > this.length) && (r = this.length), r <= 0))
        return "";
      if ((r >>>= 0) <= (t >>>= 0)) return "";
      for (e || (e = "utf8"); ;)
        switch (e) {
          case "hex":
            return C(this, t, r);
          case "utf8":
          case "utf-8":
            return T(this, t, r);
          case "ascii":
            return F(this, t, r);
          case "latin1":
          case "binary":
            return D(this, t, r);
          case "base64":
            return R(this, t, r);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return B(this, t, r);
          default:
            if (n) throw new TypeError("Unknown encoding: " + e);
            ((e = (e + "").toLowerCase()), (n = !0));
        }
    }
    function _(e, t, r) {
      var n = e[t];
      ((e[t] = e[r]), (e[r] = n));
    }
    function S(e, t, r, n, o) {
      if (0 === e.length) return -1;
      if (
        ("string" == typeof r
          ? ((n = r), (r = 0))
          : r > 2147483647
            ? (r = 2147483647)
            : r < -2147483648 && (r = -2147483648),
        V((r = +r)) && (r = o ? 0 : e.length - 1),
        r < 0 && (r = e.length + r),
        r >= e.length)
      ) {
        if (o) return -1;
        r = e.length - 1;
      } else if (r < 0) {
        if (!o) return -1;
        r = 0;
      }
      if (("string" == typeof t && (t = h.from(t, n)), h.isBuffer(t)))
        return 0 === t.length ? -1 : A(e, t, r, n, o);
      if ("number" == typeof t)
        return (
          (t &= 255),
          "function" == typeof Uint8Array.prototype.indexOf
            ? o
              ? Uint8Array.prototype.indexOf.call(e, t, r)
              : Uint8Array.prototype.lastIndexOf.call(e, t, r)
            : A(e, [t], r, n, o)
        );
      throw new TypeError("val must be string, number or Buffer");
    }
    function A(e, t, r, n, o) {
      var i,
        a = 1,
        u = e.length,
        s = t.length;
      if (
        void 0 !== n &&
        ("ucs2" === (n = String(n).toLowerCase()) ||
          "ucs-2" === n ||
          "utf16le" === n ||
          "utf-16le" === n)
      ) {
        if (e.length < 2 || t.length < 2) return -1;
        ((a = 2), (u /= 2), (s /= 2), (r /= 2));
      }
      function c(e, t) {
        return 1 === a ? e[t] : e.readUInt16BE(t * a);
      }
      if (o) {
        var l = -1;
        for (i = r; i < u; i++)
          if (c(e, i) === c(t, -1 === l ? 0 : i - l)) {
            if ((-1 === l && (l = i), i - l + 1 === s)) return l * a;
          } else (-1 !== l && (i -= i - l), (l = -1));
      } else
        for (r + s > u && (r = u - s), i = r; i >= 0; i--) {
          for (var f = !0, p = 0; p < s; p++)
            if (c(e, i + p) !== c(t, p)) {
              f = !1;
              break;
            }
          if (f) return i;
        }
      return -1;
    }
    function O(e, t, r, n) {
      r = Number(r) || 0;
      var o = e.length - r;
      n ? (n = Number(n)) > o && (n = o) : (n = o);
      var i = t.length;
      n > i / 2 && (n = i / 2);
      for (var a = 0; a < n; ++a) {
        var u = parseInt(t.substr(2 * a, 2), 16);
        if (V(u)) return a;
        e[r + a] = u;
      }
      return a;
    }
    function x(e, t, r, n) {
      return G(W(t, e.length - r), e, r, n);
    }
    function k(e, t, r, n) {
      return G(
        (function (e) {
          for (var t = [], r = 0; r < e.length; ++r)
            t.push(255 & e.charCodeAt(r));
          return t;
        })(t),
        e,
        r,
        n,
      );
    }
    function j(e, t, r, n) {
      return G($(t), e, r, n);
    }
    function P(e, t, r, n) {
      return G(
        (function (e, t) {
          for (var r, n, o, i = [], a = 0; a < e.length && !((t -= 2) < 0); ++a)
            ((n = (r = e.charCodeAt(a)) >> 8),
              (o = r % 256),
              i.push(o),
              i.push(n));
          return i;
        })(t, e.length - r),
        e,
        r,
        n,
      );
    }
    function R(e, t, r) {
      return 0 === t && r === e.length
        ? s.fromByteArray(e)
        : s.fromByteArray(e.slice(t, r));
    }
    function T(e, t, r) {
      r = Math.min(e.length, r);
      for (var n = [], o = t; o < r;) {
        var i,
          a,
          u,
          s,
          c = e[o],
          l = null,
          f = c > 239 ? 4 : c > 223 ? 3 : c > 191 ? 2 : 1;
        if (o + f <= r)
          switch (f) {
            case 1:
              c < 128 && (l = c);
              break;
            case 2:
              128 == (192 & (i = e[o + 1])) &&
                (s = ((31 & c) << 6) | (63 & i)) > 127 &&
                (l = s);
              break;
            case 3:
              ((i = e[o + 1]),
                (a = e[o + 2]),
                128 == (192 & i) &&
                  128 == (192 & a) &&
                  (s = ((15 & c) << 12) | ((63 & i) << 6) | (63 & a)) > 2047 &&
                  (s < 55296 || s > 57343) &&
                  (l = s));
              break;
            case 4:
              ((i = e[o + 1]),
                (a = e[o + 2]),
                (u = e[o + 3]),
                128 == (192 & i) &&
                  128 == (192 & a) &&
                  128 == (192 & u) &&
                  (s =
                    ((15 & c) << 18) |
                    ((63 & i) << 12) |
                    ((63 & a) << 6) |
                    (63 & u)) > 65535 &&
                  s < 1114112 &&
                  (l = s));
          }
        (null === l
          ? ((l = 65533), (f = 1))
          : l > 65535 &&
            ((l -= 65536),
            n.push(((l >>> 10) & 1023) | 55296),
            (l = 56320 | (1023 & l))),
          n.push(l),
          (o += f));
      }
      return (function (e) {
        var t = e.length;
        if (t <= I) return String.fromCharCode.apply(String, e);
        var r = "",
          n = 0;
        for (; n < t;)
          r += String.fromCharCode.apply(String, e.slice(n, (n += I)));
        return r;
      })(n);
    }
    ((u = f),
      (h.TYPED_ARRAY_SUPPORT = (function () {
        try {
          var e = new Uint8Array(1),
            t = {
              foo: function () {
                return 42;
              },
            };
          return (
            Object.setPrototypeOf(t, Uint8Array.prototype),
            Object.setPrototypeOf(e, t),
            42 === e.foo()
          );
        } catch (e) {
          return !1;
        }
      })()),
      h.TYPED_ARRAY_SUPPORT ||
        "undefined" == typeof console ||
        "function" != typeof console.error ||
        console.error(
          "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.",
        ),
      Object.defineProperty(h.prototype, "parent", {
        enumerable: !0,
        get: function () {
          if (h.isBuffer(this)) return this.buffer;
        },
      }),
      Object.defineProperty(h.prototype, "offset", {
        enumerable: !0,
        get: function () {
          if (h.isBuffer(this)) return this.byteOffset;
        },
      }),
      (h.poolSize = 8192),
      (h.from = function (e, t, r) {
        return d(e, t, r);
      }),
      Object.setPrototypeOf(h.prototype, Uint8Array.prototype),
      Object.setPrototypeOf(h, Uint8Array),
      (h.alloc = function (e, t, r) {
        return (function (e, t, r) {
          return (
            y(e),
            e <= 0
              ? p(e)
              : void 0 !== t
                ? "string" == typeof r
                  ? p(e).fill(t, r)
                  : p(e).fill(t)
                : p(e)
          );
        })(e, t, r);
      }),
      (h.allocUnsafe = function (e) {
        return g(e);
      }),
      (h.allocUnsafeSlow = function (e) {
        return g(e);
      }),
      (h.isBuffer = function (e) {
        return null != e && !0 === e._isBuffer && e !== h.prototype;
      }),
      (h.compare = function (e, t) {
        if (
          (z(e, Uint8Array) && (e = h.from(e, e.offset, e.byteLength)),
          z(t, Uint8Array) && (t = h.from(t, t.offset, t.byteLength)),
          !h.isBuffer(e) || !h.isBuffer(t))
        )
          throw new TypeError(
            'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array',
          );
        if (e === t) return 0;
        for (
          var r = e.length, n = t.length, o = 0, i = Math.min(r, n);
          o < i;
          ++o
        )
          if (e[o] !== t[o]) {
            ((r = e[o]), (n = t[o]));
            break;
          }
        return r < n ? -1 : n < r ? 1 : 0;
      }),
      (h.isEncoding = function (e) {
        switch (String(e).toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "latin1":
          case "binary":
          case "base64":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return !0;
          default:
            return !1;
        }
      }),
      (h.concat = function (e, t) {
        if (!Array.isArray(e))
          throw new TypeError('"list" argument must be an Array of Buffers');
        if (0 === e.length) return h.alloc(0);
        var r;
        if (void 0 === t)
          for (t = 0, r = 0; r < e.length; ++r) t += e[r].length;
        var n = h.allocUnsafe(t),
          o = 0;
        for (r = 0; r < e.length; ++r) {
          var i = e[r];
          if (z(i, Uint8Array))
            o + i.length > n.length
              ? h.from(i).copy(n, o)
              : Uint8Array.prototype.set.call(n, i, o);
          else {
            if (!h.isBuffer(i))
              throw new TypeError(
                '"list" argument must be an Array of Buffers',
              );
            i.copy(n, o);
          }
          o += i.length;
        }
        return n;
      }),
      (h.byteLength = w),
      (h.prototype._isBuffer = !0),
      (h.prototype.swap16 = function () {
        var e = this.length;
        if (e % 2 != 0)
          throw new RangeError("Buffer size must be a multiple of 16-bits");
        for (var t = 0; t < e; t += 2) _(this, t, t + 1);
        return this;
      }),
      (h.prototype.swap32 = function () {
        var e = this.length;
        if (e % 4 != 0)
          throw new RangeError("Buffer size must be a multiple of 32-bits");
        for (var t = 0; t < e; t += 4)
          (_(this, t, t + 3), _(this, t + 1, t + 2));
        return this;
      }),
      (h.prototype.swap64 = function () {
        var e = this.length;
        if (e % 8 != 0)
          throw new RangeError("Buffer size must be a multiple of 64-bits");
        for (var t = 0; t < e; t += 8)
          (_(this, t, t + 7),
            _(this, t + 1, t + 6),
            _(this, t + 2, t + 5),
            _(this, t + 3, t + 4));
        return this;
      }),
      (h.prototype.toString = function () {
        var e = this.length;
        return 0 === e
          ? ""
          : 0 === arguments.length
            ? T(this, 0, e)
            : E.apply(this, arguments);
      }),
      (h.prototype.toLocaleString = h.prototype.toString),
      (h.prototype.equals = function (e) {
        if (!h.isBuffer(e)) throw new TypeError("Argument must be a Buffer");
        return this === e || 0 === h.compare(this, e);
      }),
      (h.prototype.inspect = function () {
        var e = "",
          t = a;
        return (
          (e = this.toString("hex", 0, t)
            .replace(/(.{2})/g, "$1 ")
            .trim()),
          this.length > t && (e += " ... "),
          "<Buffer " + e + ">"
        );
      }),
      l && (h.prototype[l] = h.prototype.inspect),
      (h.prototype.compare = function (e, t, r, n, o) {
        if (
          (z(e, Uint8Array) && (e = h.from(e, e.offset, e.byteLength)),
          !h.isBuffer(e))
        )
          throw new TypeError(
            'The "target" argument must be one of type Buffer or Uint8Array. Received type ' +
              typeof e,
          );
        if (
          (void 0 === t && (t = 0),
          void 0 === r && (r = e ? e.length : 0),
          void 0 === n && (n = 0),
          void 0 === o && (o = this.length),
          t < 0 || r > e.length || n < 0 || o > this.length)
        )
          throw new RangeError("out of range index");
        if (n >= o && t >= r) return 0;
        if (n >= o) return -1;
        if (t >= r) return 1;
        if (this === e) return 0;
        for (
          var i = (o >>>= 0) - (n >>>= 0),
            a = (r >>>= 0) - (t >>>= 0),
            u = Math.min(i, a),
            s = this.slice(n, o),
            c = e.slice(t, r),
            l = 0;
          l < u;
          ++l
        )
          if (s[l] !== c[l]) {
            ((i = s[l]), (a = c[l]));
            break;
          }
        return i < a ? -1 : a < i ? 1 : 0;
      }),
      (h.prototype.includes = function (e, t, r) {
        return -1 !== this.indexOf(e, t, r);
      }),
      (h.prototype.indexOf = function (e, t, r) {
        return S(this, e, t, r, !0);
      }),
      (h.prototype.lastIndexOf = function (e, t, r) {
        return S(this, e, t, r, !1);
      }),
      (h.prototype.write = function (e, t, r, n) {
        if (void 0 === t) ((n = "utf8"), (r = this.length), (t = 0));
        else if (void 0 === r && "string" == typeof t)
          ((n = t), (r = this.length), (t = 0));
        else {
          if (!isFinite(t))
            throw new Error(
              "Buffer.write(string, encoding, offset[, length]) is no longer supported",
            );
          ((t >>>= 0),
            isFinite(r)
              ? ((r >>>= 0), void 0 === n && (n = "utf8"))
              : ((n = r), (r = void 0)));
        }
        var o = this.length - t;
        if (
          ((void 0 === r || r > o) && (r = o),
          (e.length > 0 && (r < 0 || t < 0)) || t > this.length)
        )
          throw new RangeError("Attempt to write outside buffer bounds");
        n || (n = "utf8");
        for (var i = !1; ;)
          switch (n) {
            case "hex":
              return O(this, e, t, r);
            case "utf8":
            case "utf-8":
              return x(this, e, t, r);
            case "ascii":
            case "latin1":
            case "binary":
              return k(this, e, t, r);
            case "base64":
              return j(this, e, t, r);
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
              return P(this, e, t, r);
            default:
              if (i) throw new TypeError("Unknown encoding: " + n);
              ((n = ("" + n).toLowerCase()), (i = !0));
          }
      }),
      (h.prototype.toJSON = function () {
        return {
          type: "Buffer",
          data: Array.prototype.slice.call(this._arr || this, 0),
        };
      }));
    var I = 4096;
    function F(e, t, r) {
      var n = "";
      r = Math.min(e.length, r);
      for (var o = t; o < r; ++o) n += String.fromCharCode(127 & e[o]);
      return n;
    }
    function D(e, t, r) {
      var n = "";
      r = Math.min(e.length, r);
      for (var o = t; o < r; ++o) n += String.fromCharCode(e[o]);
      return n;
    }
    function C(e, t, r) {
      var n = e.length;
      ((!t || t < 0) && (t = 0), (!r || r < 0 || r > n) && (r = n));
      for (var o = "", i = t; i < r; ++i) o += Y[e[i]];
      return o;
    }
    function B(e, t, r) {
      for (var n = e.slice(t, r), o = "", i = 0; i < n.length - 1; i += 2)
        o += String.fromCharCode(n[i] + 256 * n[i + 1]);
      return o;
    }
    function N(e, t, r) {
      if (e % 1 != 0 || e < 0) throw new RangeError("offset is not uint");
      if (e + t > r)
        throw new RangeError("Trying to access beyond buffer length");
    }
    function L(e, t, r, n, o, i) {
      if (!h.isBuffer(e))
        throw new TypeError('"buffer" argument must be a Buffer instance');
      if (t > o || t < i)
        throw new RangeError('"value" argument is out of bounds');
      if (r + n > e.length) throw new RangeError("Index out of range");
    }
    function M(e, t, r, n, o, i) {
      if (r + n > e.length) throw new RangeError("Index out of range");
      if (r < 0) throw new RangeError("Index out of range");
    }
    function U(e, t, r, n, o) {
      return (
        (t = +t),
        (r >>>= 0),
        o || M(e, 0, r, 4),
        c.write(e, t, r, n, 23, 4),
        r + 4
      );
    }
    function q(e, t, r, n, o) {
      return (
        (t = +t),
        (r >>>= 0),
        o || M(e, 0, r, 8),
        c.write(e, t, r, n, 52, 8),
        r + 8
      );
    }
    ((h.prototype.slice = function (e, t) {
      var r = this.length;
      ((e = ~~e) < 0 ? (e += r) < 0 && (e = 0) : e > r && (e = r),
        (t = void 0 === t ? r : ~~t) < 0
          ? (t += r) < 0 && (t = 0)
          : t > r && (t = r),
        t < e && (t = e));
      var n = this.subarray(e, t);
      return (Object.setPrototypeOf(n, h.prototype), n);
    }),
      (h.prototype.readUintLE = h.prototype.readUIntLE =
        function (e, t, r) {
          ((e >>>= 0), (t >>>= 0), r || N(e, t, this.length));
          for (var n = this[e], o = 1, i = 0; ++i < t && (o *= 256);)
            n += this[e + i] * o;
          return n;
        }),
      (h.prototype.readUintBE = h.prototype.readUIntBE =
        function (e, t, r) {
          ((e >>>= 0), (t >>>= 0), r || N(e, t, this.length));
          for (var n = this[e + --t], o = 1; t > 0 && (o *= 256);)
            n += this[e + --t] * o;
          return n;
        }),
      (h.prototype.readUint8 = h.prototype.readUInt8 =
        function (e, t) {
          return ((e >>>= 0), t || N(e, 1, this.length), this[e]);
        }),
      (h.prototype.readUint16LE = h.prototype.readUInt16LE =
        function (e, t) {
          return (
            (e >>>= 0),
            t || N(e, 2, this.length),
            this[e] | (this[e + 1] << 8)
          );
        }),
      (h.prototype.readUint16BE = h.prototype.readUInt16BE =
        function (e, t) {
          return (
            (e >>>= 0),
            t || N(e, 2, this.length),
            (this[e] << 8) | this[e + 1]
          );
        }),
      (h.prototype.readUint32LE = h.prototype.readUInt32LE =
        function (e, t) {
          return (
            (e >>>= 0),
            t || N(e, 4, this.length),
            (this[e] | (this[e + 1] << 8) | (this[e + 2] << 16)) +
              16777216 * this[e + 3]
          );
        }),
      (h.prototype.readUint32BE = h.prototype.readUInt32BE =
        function (e, t) {
          return (
            (e >>>= 0),
            t || N(e, 4, this.length),
            16777216 * this[e] +
              ((this[e + 1] << 16) | (this[e + 2] << 8) | this[e + 3])
          );
        }),
      (h.prototype.readIntLE = function (e, t, r) {
        ((e >>>= 0), (t >>>= 0), r || N(e, t, this.length));
        for (var n = this[e], o = 1, i = 0; ++i < t && (o *= 256);)
          n += this[e + i] * o;
        return (n >= (o *= 128) && (n -= Math.pow(2, 8 * t)), n);
      }),
      (h.prototype.readIntBE = function (e, t, r) {
        ((e >>>= 0), (t >>>= 0), r || N(e, t, this.length));
        for (var n = t, o = 1, i = this[e + --n]; n > 0 && (o *= 256);)
          i += this[e + --n] * o;
        return (i >= (o *= 128) && (i -= Math.pow(2, 8 * t)), i);
      }),
      (h.prototype.readInt8 = function (e, t) {
        return (
          (e >>>= 0),
          t || N(e, 1, this.length),
          128 & this[e] ? -1 * (255 - this[e] + 1) : this[e]
        );
      }),
      (h.prototype.readInt16LE = function (e, t) {
        ((e >>>= 0), t || N(e, 2, this.length));
        var r = this[e] | (this[e + 1] << 8);
        return 32768 & r ? 4294901760 | r : r;
      }),
      (h.prototype.readInt16BE = function (e, t) {
        ((e >>>= 0), t || N(e, 2, this.length));
        var r = this[e + 1] | (this[e] << 8);
        return 32768 & r ? 4294901760 | r : r;
      }),
      (h.prototype.readInt32LE = function (e, t) {
        return (
          (e >>>= 0),
          t || N(e, 4, this.length),
          this[e] |
            (this[e + 1] << 8) |
            (this[e + 2] << 16) |
            (this[e + 3] << 24)
        );
      }),
      (h.prototype.readInt32BE = function (e, t) {
        return (
          (e >>>= 0),
          t || N(e, 4, this.length),
          (this[e] << 24) |
            (this[e + 1] << 16) |
            (this[e + 2] << 8) |
            this[e + 3]
        );
      }),
      (h.prototype.readFloatLE = function (e, t) {
        return (
          (e >>>= 0),
          t || N(e, 4, this.length),
          c.read(this, e, !0, 23, 4)
        );
      }),
      (h.prototype.readFloatBE = function (e, t) {
        return (
          (e >>>= 0),
          t || N(e, 4, this.length),
          c.read(this, e, !1, 23, 4)
        );
      }),
      (h.prototype.readDoubleLE = function (e, t) {
        return (
          (e >>>= 0),
          t || N(e, 8, this.length),
          c.read(this, e, !0, 52, 8)
        );
      }),
      (h.prototype.readDoubleBE = function (e, t) {
        return (
          (e >>>= 0),
          t || N(e, 8, this.length),
          c.read(this, e, !1, 52, 8)
        );
      }),
      (h.prototype.writeUintLE = h.prototype.writeUIntLE =
        function (e, t, r, n) {
          ((e = +e), (t >>>= 0), (r >>>= 0), n) ||
            L(this, e, t, r, Math.pow(2, 8 * r) - 1, 0);
          var o = 1,
            i = 0;
          for (this[t] = 255 & e; ++i < r && (o *= 256);)
            this[t + i] = (e / o) & 255;
          return t + r;
        }),
      (h.prototype.writeUintBE = h.prototype.writeUIntBE =
        function (e, t, r, n) {
          ((e = +e), (t >>>= 0), (r >>>= 0), n) ||
            L(this, e, t, r, Math.pow(2, 8 * r) - 1, 0);
          var o = r - 1,
            i = 1;
          for (this[t + o] = 255 & e; --o >= 0 && (i *= 256);)
            this[t + o] = (e / i) & 255;
          return t + r;
        }),
      (h.prototype.writeUint8 = h.prototype.writeUInt8 =
        function (e, t, r) {
          return (
            (e = +e),
            (t >>>= 0),
            r || L(this, e, t, 1, 255, 0),
            (this[t] = 255 & e),
            t + 1
          );
        }),
      (h.prototype.writeUint16LE = h.prototype.writeUInt16LE =
        function (e, t, r) {
          return (
            (e = +e),
            (t >>>= 0),
            r || L(this, e, t, 2, 65535, 0),
            (this[t] = 255 & e),
            (this[t + 1] = e >>> 8),
            t + 2
          );
        }),
      (h.prototype.writeUint16BE = h.prototype.writeUInt16BE =
        function (e, t, r) {
          return (
            (e = +e),
            (t >>>= 0),
            r || L(this, e, t, 2, 65535, 0),
            (this[t] = e >>> 8),
            (this[t + 1] = 255 & e),
            t + 2
          );
        }),
      (h.prototype.writeUint32LE = h.prototype.writeUInt32LE =
        function (e, t, r) {
          return (
            (e = +e),
            (t >>>= 0),
            r || L(this, e, t, 4, 4294967295, 0),
            (this[t + 3] = e >>> 24),
            (this[t + 2] = e >>> 16),
            (this[t + 1] = e >>> 8),
            (this[t] = 255 & e),
            t + 4
          );
        }),
      (h.prototype.writeUint32BE = h.prototype.writeUInt32BE =
        function (e, t, r) {
          return (
            (e = +e),
            (t >>>= 0),
            r || L(this, e, t, 4, 4294967295, 0),
            (this[t] = e >>> 24),
            (this[t + 1] = e >>> 16),
            (this[t + 2] = e >>> 8),
            (this[t + 3] = 255 & e),
            t + 4
          );
        }),
      (h.prototype.writeIntLE = function (e, t, r, n) {
        if (((e = +e), (t >>>= 0), !n)) {
          var o = Math.pow(2, 8 * r - 1);
          L(this, e, t, r, o - 1, -o);
        }
        var i = 0,
          a = 1,
          u = 0;
        for (this[t] = 255 & e; ++i < r && (a *= 256);)
          (e < 0 && 0 === u && 0 !== this[t + i - 1] && (u = 1),
            (this[t + i] = (((e / a) >> 0) - u) & 255));
        return t + r;
      }),
      (h.prototype.writeIntBE = function (e, t, r, n) {
        if (((e = +e), (t >>>= 0), !n)) {
          var o = Math.pow(2, 8 * r - 1);
          L(this, e, t, r, o - 1, -o);
        }
        var i = r - 1,
          a = 1,
          u = 0;
        for (this[t + i] = 255 & e; --i >= 0 && (a *= 256);)
          (e < 0 && 0 === u && 0 !== this[t + i + 1] && (u = 1),
            (this[t + i] = (((e / a) >> 0) - u) & 255));
        return t + r;
      }),
      (h.prototype.writeInt8 = function (e, t, r) {
        return (
          (e = +e),
          (t >>>= 0),
          r || L(this, e, t, 1, 127, -128),
          e < 0 && (e = 255 + e + 1),
          (this[t] = 255 & e),
          t + 1
        );
      }),
      (h.prototype.writeInt16LE = function (e, t, r) {
        return (
          (e = +e),
          (t >>>= 0),
          r || L(this, e, t, 2, 32767, -32768),
          (this[t] = 255 & e),
          (this[t + 1] = e >>> 8),
          t + 2
        );
      }),
      (h.prototype.writeInt16BE = function (e, t, r) {
        return (
          (e = +e),
          (t >>>= 0),
          r || L(this, e, t, 2, 32767, -32768),
          (this[t] = e >>> 8),
          (this[t + 1] = 255 & e),
          t + 2
        );
      }),
      (h.prototype.writeInt32LE = function (e, t, r) {
        return (
          (e = +e),
          (t >>>= 0),
          r || L(this, e, t, 4, 2147483647, -2147483648),
          (this[t] = 255 & e),
          (this[t + 1] = e >>> 8),
          (this[t + 2] = e >>> 16),
          (this[t + 3] = e >>> 24),
          t + 4
        );
      }),
      (h.prototype.writeInt32BE = function (e, t, r) {
        return (
          (e = +e),
          (t >>>= 0),
          r || L(this, e, t, 4, 2147483647, -2147483648),
          e < 0 && (e = 4294967295 + e + 1),
          (this[t] = e >>> 24),
          (this[t + 1] = e >>> 16),
          (this[t + 2] = e >>> 8),
          (this[t + 3] = 255 & e),
          t + 4
        );
      }),
      (h.prototype.writeFloatLE = function (e, t, r) {
        return U(this, e, t, !0, r);
      }),
      (h.prototype.writeFloatBE = function (e, t, r) {
        return U(this, e, t, !1, r);
      }),
      (h.prototype.writeDoubleLE = function (e, t, r) {
        return q(this, e, t, !0, r);
      }),
      (h.prototype.writeDoubleBE = function (e, t, r) {
        return q(this, e, t, !1, r);
      }),
      (h.prototype.copy = function (e, t, r, n) {
        if (!h.isBuffer(e)) throw new TypeError("argument should be a Buffer");
        if (
          (r || (r = 0),
          n || 0 === n || (n = this.length),
          t >= e.length && (t = e.length),
          t || (t = 0),
          n > 0 && n < r && (n = r),
          n === r)
        )
          return 0;
        if (0 === e.length || 0 === this.length) return 0;
        if (t < 0) throw new RangeError("targetStart out of bounds");
        if (r < 0 || r >= this.length)
          throw new RangeError("Index out of range");
        if (n < 0) throw new RangeError("sourceEnd out of bounds");
        (n > this.length && (n = this.length),
          e.length - t < n - r && (n = e.length - t + r));
        var o = n - r;
        return (
          this === e && "function" == typeof Uint8Array.prototype.copyWithin
            ? this.copyWithin(t, r, n)
            : Uint8Array.prototype.set.call(e, this.subarray(r, n), t),
          o
        );
      }),
      (h.prototype.fill = function (e, t, r, n) {
        if ("string" == typeof e) {
          if (
            ("string" == typeof t
              ? ((n = t), (t = 0), (r = this.length))
              : "string" == typeof r && ((n = r), (r = this.length)),
            void 0 !== n && "string" != typeof n)
          )
            throw new TypeError("encoding must be a string");
          if ("string" == typeof n && !h.isEncoding(n))
            throw new TypeError("Unknown encoding: " + n);
          if (1 === e.length) {
            var o = e.charCodeAt(0);
            (("utf8" === n && o < 128) || "latin1" === n) && (e = o);
          }
        } else
          "number" == typeof e
            ? (e &= 255)
            : "boolean" == typeof e && (e = Number(e));
        if (t < 0 || this.length < t || this.length < r)
          throw new RangeError("Out of range index");
        if (r <= t) return this;
        var i;
        if (
          ((t >>>= 0),
          (r = void 0 === r ? this.length : r >>> 0),
          e || (e = 0),
          "number" == typeof e)
        )
          for (i = t; i < r; ++i) this[i] = e;
        else {
          var a = h.isBuffer(e) ? e : h.from(e, n),
            u = a.length;
          if (0 === u)
            throw new TypeError(
              'The value "' + e + '" is invalid for argument "value"',
            );
          for (i = 0; i < r - t; ++i) this[i + t] = a[i % u];
        }
        return this;
      }));
    var K = /[^+/0-9A-Za-z-_]/g;
    function W(e, t) {
      var r;
      t = t || 1 / 0;
      for (var n = e.length, o = null, i = [], a = 0; a < n; ++a) {
        if ((r = e.charCodeAt(a)) > 55295 && r < 57344) {
          if (!o) {
            if (r > 56319) {
              (t -= 3) > -1 && i.push(239, 191, 189);
              continue;
            }
            if (a + 1 === n) {
              (t -= 3) > -1 && i.push(239, 191, 189);
              continue;
            }
            o = r;
            continue;
          }
          if (r < 56320) {
            ((t -= 3) > -1 && i.push(239, 191, 189), (o = r));
            continue;
          }
          r = 65536 + (((o - 55296) << 10) | (r - 56320));
        } else o && (t -= 3) > -1 && i.push(239, 191, 189);
        if (((o = null), r < 128)) {
          if ((t -= 1) < 0) break;
          i.push(r);
        } else if (r < 2048) {
          if ((t -= 2) < 0) break;
          i.push((r >> 6) | 192, (63 & r) | 128);
        } else if (r < 65536) {
          if ((t -= 3) < 0) break;
          i.push((r >> 12) | 224, ((r >> 6) & 63) | 128, (63 & r) | 128);
        } else {
          if (!(r < 1114112)) throw new Error("Invalid code point");
          if ((t -= 4) < 0) break;
          i.push(
            (r >> 18) | 240,
            ((r >> 12) & 63) | 128,
            ((r >> 6) & 63) | 128,
            (63 & r) | 128,
          );
        }
      }
      return i;
    }
    function $(e) {
      return s.toByteArray(
        (function (e) {
          if ((e = (e = e.split("=")[0]).trim().replace(K, "")).length < 2)
            return "";
          for (; e.length % 4 != 0;) e += "=";
          return e;
        })(e),
      );
    }
    function G(e, t, r, n) {
      for (var o = 0; o < n && !(o + r >= t.length || o >= e.length); ++o)
        t[o + r] = e[o];
      return o;
    }
    function z(e, t) {
      return (
        e instanceof t ||
        (null != e &&
          null != e.constructor &&
          null != e.constructor.name &&
          e.constructor.name === t.name)
      );
    }
    function V(e) {
      return e != e;
    }
    var Y = (function () {
      for (var e = "0123456789abcdef", t = new Array(256), r = 0; r < 16; ++r)
        for (var n = 16 * r, o = 0; o < 16; ++o) t[n + o] = e[r] + e[o];
      return t;
    })();
  }),
  i.register("g2A62", function (t, r) {
    var n, o;
    (e(
      t.exports,
      "toByteArray",
      () => n,
      (e) => (n = e),
    ),
      e(
        t.exports,
        "fromByteArray",
        () => o,
        (e) => (o = e),
      ),
      (n = function (e) {
        var t,
          r,
          n = f(e),
          o = n[0],
          i = n[1],
          s = new u(
            (function (e, t, r) {
              return (3 * (t + r)) / 4 - r;
            })(0, o, i),
          ),
          c = 0,
          l = i > 0 ? o - 4 : o;
        for (r = 0; r < l; r += 4)
          ((t =
            (a[e.charCodeAt(r)] << 18) |
            (a[e.charCodeAt(r + 1)] << 12) |
            (a[e.charCodeAt(r + 2)] << 6) |
            a[e.charCodeAt(r + 3)]),
            (s[c++] = (t >> 16) & 255),
            (s[c++] = (t >> 8) & 255),
            (s[c++] = 255 & t));
        2 === i &&
          ((t = (a[e.charCodeAt(r)] << 2) | (a[e.charCodeAt(r + 1)] >> 4)),
          (s[c++] = 255 & t));
        1 === i &&
          ((t =
            (a[e.charCodeAt(r)] << 10) |
            (a[e.charCodeAt(r + 1)] << 4) |
            (a[e.charCodeAt(r + 2)] >> 2)),
          (s[c++] = (t >> 8) & 255),
          (s[c++] = 255 & t));
        return s;
      }),
      (o = function (e) {
        for (
          var t, r = e.length, n = r % 3, o = [], a = 16383, u = 0, s = r - n;
          u < s;
          u += a
        )
          o.push(p(e, u, u + a > s ? s : u + a));
        1 === n
          ? ((t = e[r - 1]), o.push(i[t >> 2] + i[(t << 4) & 63] + "=="))
          : 2 === n &&
            ((t = (e[r - 2] << 8) + e[r - 1]),
            o.push(i[t >> 10] + i[(t >> 4) & 63] + i[(t << 2) & 63] + "="));
        return o.join("");
      }));
    for (
      var i = [],
        a = [],
        u = "undefined" != typeof Uint8Array ? Uint8Array : Array,
        s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
        c = 0,
        l = s.length;
      c < l;
      ++c
    )
      ((i[c] = s[c]), (a[s.charCodeAt(c)] = c));
    function f(e) {
      var t = e.length;
      if (t % 4 > 0)
        throw new Error("Invalid string. Length must be a multiple of 4");
      var r = e.indexOf("=");
      return (-1 === r && (r = t), [r, r === t ? 0 : 4 - (r % 4)]);
    }
    function p(e, t, r) {
      for (var n, o, a = [], u = t; u < r; u += 3)
        ((n =
          ((e[u] << 16) & 16711680) +
          ((e[u + 1] << 8) & 65280) +
          (255 & e[u + 2])),
          a.push(
            i[((o = n) >> 18) & 63] +
              i[(o >> 12) & 63] +
              i[(o >> 6) & 63] +
              i[63 & o],
          ));
      return a.join("");
    }
    ((a["-".charCodeAt(0)] = 62), (a["_".charCodeAt(0)] = 63));
  }),
  i.register("5rhbH", function (t, r) {
    /*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */ var n,
      o;
    (e(
      t.exports,
      "read",
      () => n,
      (e) => (n = e),
    ),
      e(
        t.exports,
        "write",
        () => o,
        (e) => (o = e),
      ),
      (n = function (e, t, r, n, o) {
        var i,
          a,
          u = 8 * o - n - 1,
          s = (1 << u) - 1,
          c = s >> 1,
          l = -7,
          f = r ? o - 1 : 0,
          p = r ? -1 : 1,
          h = e[t + f];
        for (
          f += p, i = h & ((1 << -l) - 1), h >>= -l, l += u;
          l > 0;
          i = 256 * i + e[t + f], f += p, l -= 8
        );
        for (
          a = i & ((1 << -l) - 1), i >>= -l, l += n;
          l > 0;
          a = 256 * a + e[t + f], f += p, l -= 8
        );
        if (0 === i) i = 1 - c;
        else {
          if (i === s) return a ? NaN : (1 / 0) * (h ? -1 : 1);
          ((a += Math.pow(2, n)), (i -= c));
        }
        return (h ? -1 : 1) * a * Math.pow(2, i - n);
      }),
      (o = function (e, t, r, n, o, i) {
        var a,
          u,
          s,
          c = 8 * i - o - 1,
          l = (1 << c) - 1,
          f = l >> 1,
          p = 23 === o ? Math.pow(2, -24) - Math.pow(2, -77) : 0,
          h = n ? 0 : i - 1,
          d = n ? 1 : -1,
          y = t < 0 || (0 === t && 1 / t < 0) ? 1 : 0;
        for (
          t = Math.abs(t),
            isNaN(t) || t === 1 / 0
              ? ((u = isNaN(t) ? 1 : 0), (a = l))
              : ((a = Math.floor(Math.log(t) / Math.LN2)),
                t * (s = Math.pow(2, -a)) < 1 && (a--, (s *= 2)),
                (t += a + f >= 1 ? p / s : p * Math.pow(2, 1 - f)) * s >= 2 &&
                  (a++, (s /= 2)),
                a + f >= l
                  ? ((u = 0), (a = l))
                  : a + f >= 1
                    ? ((u = (t * s - 1) * Math.pow(2, o)), (a += f))
                    : ((u = t * Math.pow(2, f - 1) * Math.pow(2, o)), (a = 0)));
          o >= 8;
          e[r + h] = 255 & u, h += d, u /= 256, o -= 8
        );
        for (
          a = (a << o) | u, c += o;
          c > 0;
          e[r + h] = 255 & a, h += d, a /= 256, c -= 8
        );
        e[r + h - d] |= 128 * y;
      }));
  }),
  i.register("ivIyE", function (e, t) {
    var r = i("kIky1");
    function n(e) {
      return (
        (n =
          "function" == typeof Symbol && "symbol" == typeof Symbol.iterator
            ? function (e) {
                return typeof e;
              }
            : function (e) {
                return e &&
                  "function" == typeof Symbol &&
                  e.constructor === Symbol &&
                  e !== Symbol.prototype
                  ? "symbol"
                  : typeof e;
              }),
        n(e)
      );
    }
    var o,
      a,
      u = i("emTJb").codes,
      s = u.ERR_AMBIGUOUS_ARGUMENT,
      c = u.ERR_INVALID_ARG_TYPE,
      l = u.ERR_INVALID_ARG_VALUE,
      f = u.ERR_INVALID_RETURN_VALUE,
      p = u.ERR_MISSING_ARGS,
      h = i("clFY1"),
      d = i("dvmmp").inspect,
      y = i("dvmmp").types,
      g = y.isPromise,
      v = y.isRegExp,
      m = Object.assign ? Object.assign : i("kcfVP").assign,
      b = Object.is ? Object.is : i("ywNA6");
    new Map();
    function w() {
      var e = i("jKPza");
      ((o = e.isDeepEqual), (a = e.isDeepStrictEqual));
    }
    var E = !1,
      _ = (e.exports = x),
      S = {};
    function A(e) {
      if (e.message instanceof Error) throw e.message;
      throw new h(e);
    }
    function O(e, t, r, n) {
      if (!r) {
        var o = !1;
        if (0 === t)
          ((o = !0), (n = "No value argument passed to `assert.ok()`"));
        else if (n instanceof Error) throw n;
        var i = new h({
          actual: r,
          expected: !0,
          message: n,
          operator: "==",
          stackStartFn: e,
        });
        throw ((i.generatedMessage = o), i);
      }
    }
    function x() {
      for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++)
        t[r] = arguments[r];
      O.apply(void 0, [x, t.length].concat(t));
    }
    ((_.fail = function e(t, n, o, i, a) {
      var u,
        s = arguments.length;
      if (0 === s) u = "Failed";
      else if (1 === s) ((o = t), (t = void 0));
      else {
        if (!1 === E)
          ((E = !0),
            (r.emitWarning ? r.emitWarning : console.warn.bind(console))(
              "assert.fail() with more than one argument is deprecated. Please use assert.strictEqual() instead or only pass a message.",
              "DeprecationWarning",
              "DEP0094",
            ));
        2 === s && (i = "!=");
      }
      if (o instanceof Error) throw o;
      var c = {
        actual: t,
        expected: n,
        operator: void 0 === i ? "fail" : i,
        stackStartFn: a || e,
      };
      void 0 !== o && (c.message = o);
      var l = new h(c);
      throw (u && ((l.message = u), (l.generatedMessage = !0)), l);
    }),
      (_.AssertionError = h),
      (_.ok = x),
      (_.equal = function e(t, r, n) {
        if (arguments.length < 2) throw new p("actual", "expected");
        t != r &&
          A({
            actual: t,
            expected: r,
            message: n,
            operator: "==",
            stackStartFn: e,
          });
      }),
      (_.notEqual = function e(t, r, n) {
        if (arguments.length < 2) throw new p("actual", "expected");
        t == r &&
          A({
            actual: t,
            expected: r,
            message: n,
            operator: "!=",
            stackStartFn: e,
          });
      }),
      (_.deepEqual = function e(t, r, n) {
        if (arguments.length < 2) throw new p("actual", "expected");
        (void 0 === o && w(),
          o(t, r) ||
            A({
              actual: t,
              expected: r,
              message: n,
              operator: "deepEqual",
              stackStartFn: e,
            }));
      }),
      (_.notDeepEqual = function e(t, r, n) {
        if (arguments.length < 2) throw new p("actual", "expected");
        (void 0 === o && w(),
          o(t, r) &&
            A({
              actual: t,
              expected: r,
              message: n,
              operator: "notDeepEqual",
              stackStartFn: e,
            }));
      }),
      (_.deepStrictEqual = function e(t, r, n) {
        if (arguments.length < 2) throw new p("actual", "expected");
        (void 0 === o && w(),
          a(t, r) ||
            A({
              actual: t,
              expected: r,
              message: n,
              operator: "deepStrictEqual",
              stackStartFn: e,
            }));
      }),
      (_.notDeepStrictEqual = function e(t, r, n) {
        if (arguments.length < 2) throw new p("actual", "expected");
        void 0 === o && w();
        a(t, r) &&
          A({
            actual: t,
            expected: r,
            message: n,
            operator: "notDeepStrictEqual",
            stackStartFn: e,
          });
      }),
      (_.strictEqual = function e(t, r, n) {
        if (arguments.length < 2) throw new p("actual", "expected");
        b(t, r) ||
          A({
            actual: t,
            expected: r,
            message: n,
            operator: "strictEqual",
            stackStartFn: e,
          });
      }),
      (_.notStrictEqual = function e(t, r, n) {
        if (arguments.length < 2) throw new p("actual", "expected");
        b(t, r) &&
          A({
            actual: t,
            expected: r,
            message: n,
            operator: "notStrictEqual",
            stackStartFn: e,
          });
      }));
    var k = function e(t, r, n) {
      var o = this;
      (!(function (e, t) {
        if (!(e instanceof t))
          throw new TypeError("Cannot call a class as a function");
      })(this, e),
        r.forEach(function (e) {
          e in t &&
            (void 0 !== n &&
            "string" == typeof n[e] &&
            v(t[e]) &&
            t[e].test(n[e])
              ? (o[e] = n[e])
              : (o[e] = t[e]));
        }));
    };
    function j(e, t, r, i) {
      if ("function" != typeof t) {
        if (v(t)) return t.test(e);
        if (2 === arguments.length)
          throw new c("expected", ["Function", "RegExp"], t);
        if ("object" !== n(e) || null === e) {
          var u = new h({
            actual: e,
            expected: t,
            message: r,
            operator: "deepStrictEqual",
            stackStartFn: i,
          });
          throw ((u.operator = i.name), u);
        }
        var s = Object.keys(t);
        if (t instanceof Error) s.push("name", "message");
        else if (0 === s.length)
          throw new l("error", t, "may not be an empty object");
        return (
          void 0 === o && w(),
          s.forEach(function (n) {
            ("string" == typeof e[n] && v(t[n]) && t[n].test(e[n])) ||
              (function (e, t, r, n, o, i) {
                if (!(r in e) || !a(e[r], t[r])) {
                  if (!n) {
                    var u = new k(e, o),
                      s = new k(t, o, e),
                      c = new h({
                        actual: u,
                        expected: s,
                        operator: "deepStrictEqual",
                        stackStartFn: i,
                      });
                    throw (
                      (c.actual = e),
                      (c.expected = t),
                      (c.operator = i.name),
                      c
                    );
                  }
                  A({
                    actual: e,
                    expected: t,
                    message: n,
                    operator: i.name,
                    stackStartFn: i,
                  });
                }
              })(e, t, n, r, s, i);
          }),
          !0
        );
      }
      return (
        (void 0 !== t.prototype && e instanceof t) ||
        (!Error.isPrototypeOf(t) && !0 === t.call({}, e))
      );
    }
    function P(e) {
      if ("function" != typeof e) throw new c("fn", "Function", e);
      try {
        e();
      } catch (e) {
        return e;
      }
      return S;
    }
    function R(e) {
      return (
        g(e) ||
        (null !== e &&
          "object" === n(e) &&
          "function" == typeof e.then &&
          "function" == typeof e.catch)
      );
    }
    function T(e) {
      return Promise.resolve().then(function () {
        var t;
        if ("function" == typeof e) {
          if (!R((t = e()))) throw new f("instance of Promise", "promiseFn", t);
        } else {
          if (!R(e)) throw new c("promiseFn", ["Function", "Promise"], e);
          t = e;
        }
        return Promise.resolve()
          .then(function () {
            return t;
          })
          .then(function () {
            return S;
          })
          .catch(function (e) {
            return e;
          });
      });
    }
    function I(e, t, r, o) {
      if ("string" == typeof r) {
        if (4 === arguments.length)
          throw new c("error", ["Object", "Error", "Function", "RegExp"], r);
        if ("object" === n(t) && null !== t) {
          if (t.message === r)
            throw new s(
              "error/message",
              'The error message "'.concat(
                t.message,
                '" is identical to the message.',
              ),
            );
        } else if (t === r)
          throw new s(
            "error/message",
            'The error "'.concat(t, '" is identical to the message.'),
          );
        ((o = r), (r = void 0));
      } else if (null != r && "object" !== n(r) && "function" != typeof r)
        throw new c("error", ["Object", "Error", "Function", "RegExp"], r);
      if (t === S) {
        var i = "";
        (r && r.name && (i += " (".concat(r.name, ")")),
          (i += o ? ": ".concat(o) : "."));
        var a = "rejects" === e.name ? "rejection" : "exception";
        A({
          actual: void 0,
          expected: r,
          operator: e.name,
          message: "Missing expected ".concat(a).concat(i),
          stackStartFn: e,
        });
      }
      if (r && !j(t, r, o, e)) throw t;
    }
    function F(e, t, r, n) {
      if (t !== S) {
        if (("string" == typeof r && ((n = r), (r = void 0)), !r || j(t, r))) {
          var o = n ? ": ".concat(n) : ".",
            i = "doesNotReject" === e.name ? "rejection" : "exception";
          A({
            actual: t,
            expected: r,
            operator: e.name,
            message:
              "Got unwanted ".concat(i).concat(o, "\n") +
              'Actual message: "'.concat(t && t.message, '"'),
            stackStartFn: e,
          });
        }
        throw t;
      }
    }
    function D() {
      for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++)
        t[r] = arguments[r];
      O.apply(void 0, [D, t.length].concat(t));
    }
    ((_.throws = function e(t) {
      for (
        var r = arguments.length, n = new Array(r > 1 ? r - 1 : 0), o = 1;
        o < r;
        o++
      )
        n[o - 1] = arguments[o];
      I.apply(void 0, [e, P(t)].concat(n));
    }),
      (_.rejects = function e(t) {
        for (
          var r = arguments.length, n = new Array(r > 1 ? r - 1 : 0), o = 1;
          o < r;
          o++
        )
          n[o - 1] = arguments[o];
        return T(t).then(function (t) {
          return I.apply(void 0, [e, t].concat(n));
        });
      }),
      (_.doesNotThrow = function e(t) {
        for (
          var r = arguments.length, n = new Array(r > 1 ? r - 1 : 0), o = 1;
          o < r;
          o++
        )
          n[o - 1] = arguments[o];
        F.apply(void 0, [e, P(t)].concat(n));
      }),
      (_.doesNotReject = function e(t) {
        for (
          var r = arguments.length, n = new Array(r > 1 ? r - 1 : 0), o = 1;
          o < r;
          o++
        )
          n[o - 1] = arguments[o];
        return T(t).then(function (t) {
          return F.apply(void 0, [e, t].concat(n));
        });
      }),
      (_.ifError = function e(t) {
        if (null != t) {
          var r = "ifError got unwanted exception: ";
          "object" === n(t) && "string" == typeof t.message
            ? 0 === t.message.length && t.constructor
              ? (r += t.constructor.name)
              : (r += t.message)
            : (r += d(t));
          var o = new h({
              actual: t,
              expected: null,
              operator: "ifError",
              message: r,
              stackStartFn: e,
            }),
            i = t.stack;
          if ("string" == typeof i) {
            var a = i.split("\n");
            a.shift();
            for (var u = o.stack.split("\n"), s = 0; s < a.length; s++) {
              var c = u.indexOf(a[s]);
              if (-1 !== c) {
                u = u.slice(0, c);
                break;
              }
            }
            o.stack = "".concat(u.join("\n"), "\n").concat(a.join("\n"));
          }
          throw o;
        }
      }),
      (_.strict = m(D, _, {
        equal: _.strictEqual,
        deepEqual: _.deepStrictEqual,
        notEqual: _.notStrictEqual,
        notDeepEqual: _.notDeepStrictEqual,
      })),
      (_.strict.strict = _.strict));
  }),
  i.register("kIky1", function (e, t) {
    var r,
      n,
      o = (e.exports = {});
    function i() {
      throw new Error("setTimeout has not been defined");
    }
    function a() {
      throw new Error("clearTimeout has not been defined");
    }
    function u(e) {
      if (r === setTimeout) return setTimeout(e, 0);
      if ((r === i || !r) && setTimeout)
        return ((r = setTimeout), setTimeout(e, 0));
      try {
        return r(e, 0);
      } catch (t) {
        try {
          return r.call(null, e, 0);
        } catch (t) {
          return r.call(this, e, 0);
        }
      }
    }
    !(function () {
      try {
        r = "function" == typeof setTimeout ? setTimeout : i;
      } catch (e) {
        r = i;
      }
      try {
        n = "function" == typeof clearTimeout ? clearTimeout : a;
      } catch (e) {
        n = a;
      }
    })();
    var s,
      c = [],
      l = !1,
      f = -1;
    function p() {
      l &&
        s &&
        ((l = !1), s.length ? (c = s.concat(c)) : (f = -1), c.length && h());
    }
    function h() {
      if (!l) {
        var e = u(p);
        l = !0;
        for (var t = c.length; t;) {
          for (s = c, c = []; ++f < t;) s && s[f].run();
          ((f = -1), (t = c.length));
        }
        ((s = null),
          (l = !1),
          (function (e) {
            if (n === clearTimeout) return clearTimeout(e);
            if ((n === a || !n) && clearTimeout)
              return ((n = clearTimeout), clearTimeout(e));
            try {
              return n(e);
            } catch (t) {
              try {
                return n.call(null, e);
              } catch (t) {
                return n.call(this, e);
              }
            }
          })(e));
      }
    }
    function d(e, t) {
      ((this.fun = e), (this.array = t));
    }
    function y() {}
    ((o.nextTick = function (e) {
      var t = new Array(arguments.length - 1);
      if (arguments.length > 1)
        for (var r = 1; r < arguments.length; r++) t[r - 1] = arguments[r];
      (c.push(new d(e, t)), 1 !== c.length || l || u(h));
    }),
      (d.prototype.run = function () {
        this.fun.apply(null, this.array);
      }),
      (o.title = "browser"),
      (o.browser = !0),
      (o.env = {}),
      (o.argv = []),
      (o.version = ""),
      (o.versions = {}),
      (o.on = y),
      (o.addListener = y),
      (o.once = y),
      (o.off = y),
      (o.removeListener = y),
      (o.removeAllListeners = y),
      (o.emit = y),
      (o.prependListener = y),
      (o.prependOnceListener = y),
      (o.listeners = function (e) {
        return [];
      }),
      (o.binding = function (e) {
        throw new Error("process.binding is not supported");
      }),
      (o.cwd = function () {
        return "/";
      }),
      (o.chdir = function (e) {
        throw new Error("process.chdir is not supported");
      }),
      (o.umask = function () {
        return 0;
      }));
  }),
  i.register("emTJb", function (t, r) {
    var n;
    function o(e) {
      return (
        (o =
          "function" == typeof Symbol && "symbol" == typeof Symbol.iterator
            ? function (e) {
                return typeof e;
              }
            : function (e) {
                return e &&
                  "function" == typeof Symbol &&
                  e.constructor === Symbol &&
                  e !== Symbol.prototype
                  ? "symbol"
                  : typeof e;
              }),
        o(e)
      );
    }
    function a(e, t) {
      return !t || ("object" !== o(t) && "function" != typeof t)
        ? (function (e) {
            if (void 0 === e)
              throw new ReferenceError(
                "this hasn't been initialised - super() hasn't been called",
              );
            return e;
          })(e)
        : t;
    }
    function u(e) {
      return (
        (u = Object.setPrototypeOf
          ? Object.getPrototypeOf
          : function (e) {
              return e.__proto__ || Object.getPrototypeOf(e);
            }),
        u(e)
      );
    }
    function s(e, t) {
      return (
        (s =
          Object.setPrototypeOf ||
          function (e, t) {
            return ((e.__proto__ = t), e);
          }),
        s(e, t)
      );
    }
    e(
      t.exports,
      "codes",
      () => n,
      (e) => (n = e),
    );
    var c,
      l,
      f = {};
    function p(e, t, r) {
      r || (r = Error);
      var n = (function (r) {
        function n(r, o, i) {
          var s;
          return (
            (function (e, t) {
              if (!(e instanceof t))
                throw new TypeError("Cannot call a class as a function");
            })(this, n),
            (s = a(
              this,
              u(n).call(
                this,
                (function (e, r, n) {
                  return "string" == typeof t ? t : t(e, r, n);
                })(r, o, i),
              ),
            )),
            (s.code = e),
            s
          );
        }
        return (
          (function (e, t) {
            if ("function" != typeof t && null !== t)
              throw new TypeError(
                "Super expression must either be null or a function",
              );
            ((e.prototype = Object.create(t && t.prototype, {
              constructor: { value: e, writable: !0, configurable: !0 },
            })),
              t && s(e, t));
          })(n, r),
          n
        );
      })(r);
      f[e] = n;
    }
    function h(e, t) {
      if (Array.isArray(e)) {
        var r = e.length;
        return (
          (e = e.map(function (e) {
            return String(e);
          })),
          r > 2
            ? "one of "
                .concat(t, " ")
                .concat(e.slice(0, r - 1).join(", "), ", or ") + e[r - 1]
            : 2 === r
              ? "one of ".concat(t, " ").concat(e[0], " or ").concat(e[1])
              : "of ".concat(t, " ").concat(e[0])
        );
      }
      return "of ".concat(t, " ").concat(String(e));
    }
    (p(
      "ERR_AMBIGUOUS_ARGUMENT",
      'The "%s" argument is ambiguous. %s',
      TypeError,
    ),
      p(
        "ERR_INVALID_ARG_TYPE",
        function (e, t, r) {
          var n, a, u, s;
          if (
            (void 0 === c && (c = i("ivIyE")),
            c("string" == typeof e, "'name' must be a string"),
            "string" == typeof t &&
            ((a = "not "), t.substr(!u || u < 0 ? 0 : +u, a.length) === a)
              ? ((n = "must not be"), (t = t.replace(/^not /, "")))
              : (n = "must be"),
            (function (e, t, r) {
              return (
                (void 0 === r || r > e.length) && (r = e.length),
                e.substring(r - t.length, r) === t
              );
            })(e, " argument"))
          )
            s = "The ".concat(e, " ").concat(n, " ").concat(h(t, "type"));
          else {
            var l = (function (e, t, r) {
              return (
                "number" != typeof r && (r = 0),
                !(r + t.length > e.length) && -1 !== e.indexOf(t, r)
              );
            })(e, ".")
              ? "property"
              : "argument";
            s = 'The "'
              .concat(e, '" ')
              .concat(l, " ")
              .concat(n, " ")
              .concat(h(t, "type"));
          }
          return (s += ". Received type ".concat(o(r)));
        },
        TypeError,
      ),
      p(
        "ERR_INVALID_ARG_VALUE",
        function (e, t) {
          var r =
            arguments.length > 2 && void 0 !== arguments[2]
              ? arguments[2]
              : "is invalid";
          void 0 === l && (l = i("dvmmp"));
          var n = l.inspect(t);
          return (
            n.length > 128 && (n = "".concat(n.slice(0, 128), "...")),
            "The argument '".concat(e, "' ").concat(r, ". Received ").concat(n)
          );
        },
        TypeError,
        RangeError,
      ),
      p(
        "ERR_INVALID_RETURN_VALUE",
        function (e, t, r) {
          var n;
          return (
            (n =
              r && r.constructor && r.constructor.name
                ? "instance of ".concat(r.constructor.name)
                : "type ".concat(o(r))),
            "Expected ".concat(e, ' to be returned from the "').concat(t, '"') +
              " function but got ".concat(n, ".")
          );
        },
        TypeError,
      ),
      p(
        "ERR_MISSING_ARGS",
        function () {
          for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++)
            t[r] = arguments[r];
          (void 0 === c && (c = i("ivIyE")),
            c(t.length > 0, "At least one arg needs to be specified"));
          var n = "The ",
            o = t.length;
          switch (
            ((t = t.map(function (e) {
              return '"'.concat(e, '"');
            })),
            o)
          ) {
            case 1:
              n += "".concat(t[0], " argument");
              break;
            case 2:
              n += "".concat(t[0], " and ").concat(t[1], " arguments");
              break;
            default:
              ((n += t.slice(0, o - 1).join(", ")),
                (n += ", and ".concat(t[o - 1], " arguments")));
          }
          return "".concat(n, " must be specified");
        },
        TypeError,
      ),
      (n = f));
  }),
  i.register("dvmmp", function (e, t) {
    var r = i("kIky1"),
      n =
        Object.getOwnPropertyDescriptors ||
        function (e) {
          for (var t = Object.keys(e), r = {}, n = 0; n < t.length; n++)
            r[t[n]] = Object.getOwnPropertyDescriptor(e, t[n]);
          return r;
        },
      o = /%[sdj%]/g;
    ((e.exports.format = function (e) {
      if (!m(e)) {
        for (var t = [], r = 0; r < arguments.length; r++)
          t.push(s(arguments[r]));
        return t.join(" ");
      }
      r = 1;
      for (
        var n = arguments,
          i = n.length,
          a = String(e).replace(o, function (e) {
            if ("%%" === e) return "%";
            if (r >= i) return e;
            switch (e) {
              case "%s":
                return String(n[r++]);
              case "%d":
                return Number(n[r++]);
              case "%j":
                try {
                  return JSON.stringify(n[r++]);
                } catch (e) {
                  return "[Circular]";
                }
              default:
                return e;
            }
          }),
          u = n[r];
        r < i;
        u = n[++r]
      )
        g(u) || !E(u) ? (a += " " + u) : (a += " " + s(u));
      return a;
    }),
      (e.exports.deprecate = function (t, n) {
        if (void 0 !== r && !0 === r.noDeprecation) return t;
        if (void 0 === r)
          return function () {
            return e.exports.deprecate(t, n).apply(this, arguments);
          };
        var o = !1;
        return function () {
          if (!o) {
            if (r.throwDeprecation) throw new Error(n);
            (r.traceDeprecation ? console.trace(n) : console.error(n),
              (o = !0));
          }
          return t.apply(this, arguments);
        };
      }));
    var a = {},
      u = /^$/;
    function s(t, r) {
      var n = { seen: [], stylize: l };
      return (
        arguments.length >= 3 && (n.depth = arguments[2]),
        arguments.length >= 4 && (n.colors = arguments[3]),
        y(r) ? (n.showHidden = r) : r && e.exports._extend(n, r),
        b(n.showHidden) && (n.showHidden = !1),
        b(n.depth) && (n.depth = 2),
        b(n.colors) && (n.colors = !1),
        b(n.customInspect) && (n.customInspect = !0),
        n.colors && (n.stylize = c),
        f(n, t, n.depth)
      );
    }
    function c(e, t) {
      var r = s.styles[t];
      return r
        ? "[" + s.colors[r][0] + "m" + e + "[" + s.colors[r][1] + "m"
        : e;
    }
    function l(e, t) {
      return e;
    }
    function f(t, r, n) {
      if (
        t.customInspect &&
        r &&
        A(r.inspect) &&
        r.inspect !== e.exports.inspect &&
        (!r.constructor || r.constructor.prototype !== r)
      ) {
        var o = r.inspect(n, t);
        return (m(o) || (o = f(t, o, n)), o);
      }
      var i = (function (e, t) {
        if (b(t)) return e.stylize("undefined", "undefined");
        if (m(t)) {
          var r =
            "'" +
            JSON.stringify(t)
              .replace(/^"|"$/g, "")
              .replace(/'/g, "\\'")
              .replace(/\\"/g, '"') +
            "'";
          return e.stylize(r, "string");
        }
        if (v(t)) return e.stylize("" + t, "number");
        if (y(t)) return e.stylize("" + t, "boolean");
        if (g(t)) return e.stylize("null", "null");
      })(t, r);
      if (i) return i;
      var a = Object.keys(r),
        u = (function (e) {
          var t = {};
          return (
            e.forEach(function (e, r) {
              t[e] = !0;
            }),
            t
          );
        })(a);
      if (
        (t.showHidden && (a = Object.getOwnPropertyNames(r)),
        S(r) && (a.indexOf("message") >= 0 || a.indexOf("description") >= 0))
      )
        return p(r);
      if (0 === a.length) {
        if (A(r)) {
          var s = r.name ? ": " + r.name : "";
          return t.stylize("[Function" + s + "]", "special");
        }
        if (w(r)) return t.stylize(RegExp.prototype.toString.call(r), "regexp");
        if (_(r)) return t.stylize(Date.prototype.toString.call(r), "date");
        if (S(r)) return p(r);
      }
      var c,
        l = "",
        E = !1,
        O = ["{", "}"];
      (d(r) && ((E = !0), (O = ["[", "]"])), A(r)) &&
        (l = " [Function" + (r.name ? ": " + r.name : "") + "]");
      return (
        w(r) && (l = " " + RegExp.prototype.toString.call(r)),
        _(r) && (l = " " + Date.prototype.toUTCString.call(r)),
        S(r) && (l = " " + p(r)),
        0 !== a.length || (E && 0 != r.length)
          ? n < 0
            ? w(r)
              ? t.stylize(RegExp.prototype.toString.call(r), "regexp")
              : t.stylize("[Object]", "special")
            : (t.seen.push(r),
              (c = E
                ? (function (e, t, r, n, o) {
                    for (var i = [], a = 0, u = t.length; a < u; ++a)
                      j(t, String(a))
                        ? i.push(h(e, t, r, n, String(a), !0))
                        : i.push("");
                    return (
                      o.forEach(function (o) {
                        o.match(/^\d+$/) || i.push(h(e, t, r, n, o, !0));
                      }),
                      i
                    );
                  })(t, r, n, u, a)
                : a.map(function (e) {
                    return h(t, r, n, u, e, E);
                  })),
              t.seen.pop(),
              (function (e, t, r) {
                var n = e.reduce(function (e, t) {
                  return (
                    t.indexOf("\n") >= 0 && 0,
                    e + t.replace(/\u001b\[\d\d?m/g, "").length + 1
                  );
                }, 0);
                return n > 60
                  ? r[0] +
                      ("" === t ? "" : t + "\n ") +
                      " " +
                      e.join(",\n  ") +
                      " " +
                      r[1]
                  : r[0] + t + " " + e.join(", ") + " " + r[1];
              })(c, l, O))
          : O[0] + l + O[1]
      );
    }
    function p(e) {
      return "[" + Error.prototype.toString.call(e) + "]";
    }
    function h(e, t, r, n, o, i) {
      var a, u, s;
      if (
        ((s = Object.getOwnPropertyDescriptor(t, o) || { value: t[o] }).get
          ? (u = s.set
              ? e.stylize("[Getter/Setter]", "special")
              : e.stylize("[Getter]", "special"))
          : s.set && (u = e.stylize("[Setter]", "special")),
        j(n, o) || (a = "[" + o + "]"),
        u ||
          (e.seen.indexOf(s.value) < 0
            ? (u = g(r) ? f(e, s.value, null) : f(e, s.value, r - 1)).indexOf(
                "\n",
              ) > -1 &&
              (u = i
                ? u
                    .split("\n")
                    .map(function (e) {
                      return "  " + e;
                    })
                    .join("\n")
                    .slice(2)
                : "\n" +
                  u
                    .split("\n")
                    .map(function (e) {
                      return "   " + e;
                    })
                    .join("\n"))
            : (u = e.stylize("[Circular]", "special"))),
        b(a))
      ) {
        if (i && o.match(/^\d+$/)) return u;
        (a = JSON.stringify("" + o)).match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)
          ? ((a = a.slice(1, -1)), (a = e.stylize(a, "name")))
          : ((a = a
              .replace(/'/g, "\\'")
              .replace(/\\"/g, '"')
              .replace(/(^"|"$)/g, "'")),
            (a = e.stylize(a, "string")));
      }
      return a + ": " + u;
    }
    function d(e) {
      return Array.isArray(e);
    }
    function y(e) {
      return "boolean" == typeof e;
    }
    function g(e) {
      return null === e;
    }
    function v(e) {
      return "number" == typeof e;
    }
    function m(e) {
      return "string" == typeof e;
    }
    function b(e) {
      return void 0 === e;
    }
    function w(e) {
      return E(e) && "[object RegExp]" === O(e);
    }
    function E(e) {
      return "object" == typeof e && null !== e;
    }
    function _(e) {
      return E(e) && "[object Date]" === O(e);
    }
    function S(e) {
      return E(e) && ("[object Error]" === O(e) || e instanceof Error);
    }
    function A(e) {
      return "function" == typeof e;
    }
    function O(e) {
      return Object.prototype.toString.call(e);
    }
    function x(e) {
      return e < 10 ? "0" + e.toString(10) : e.toString(10);
    }
    ((e.exports.debuglog = function (t) {
      if (((t = t.toUpperCase()), !a[t]))
        if (u.test(t)) {
          var n = r.pid;
          a[t] = function () {
            var r = e.exports.format.apply(e.exports, arguments);
            console.error("%s %d: %s", t, n, r);
          };
        } else a[t] = function () {};
      return a[t];
    }),
      (e.exports.inspect = s),
      (s.colors = {
        bold: [1, 22],
        italic: [3, 23],
        underline: [4, 24],
        inverse: [7, 27],
        white: [37, 39],
        grey: [90, 39],
        black: [30, 39],
        blue: [34, 39],
        cyan: [36, 39],
        green: [32, 39],
        magenta: [35, 39],
        red: [31, 39],
        yellow: [33, 39],
      }),
      (s.styles = {
        special: "cyan",
        number: "yellow",
        boolean: "yellow",
        undefined: "grey",
        null: "bold",
        string: "green",
        date: "magenta",
        regexp: "red",
      }),
      (e.exports.types = i("j2lhj")),
      (e.exports.isArray = d),
      (e.exports.isBoolean = y),
      (e.exports.isNull = g),
      (e.exports.isNullOrUndefined = function (e) {
        return null == e;
      }),
      (e.exports.isNumber = v),
      (e.exports.isString = m),
      (e.exports.isSymbol = function (e) {
        return "symbol" == typeof e;
      }),
      (e.exports.isUndefined = b),
      (e.exports.isRegExp = w),
      (e.exports.types.isRegExp = w),
      (e.exports.isObject = E),
      (e.exports.isDate = _),
      (e.exports.types.isDate = _),
      (e.exports.isError = S),
      (e.exports.types.isNativeError = S),
      (e.exports.isFunction = A),
      (e.exports.isPrimitive = function (e) {
        return (
          null === e ||
          "boolean" == typeof e ||
          "number" == typeof e ||
          "string" == typeof e ||
          "symbol" == typeof e ||
          void 0 === e
        );
      }),
      (e.exports.isBuffer = i("8r9EX")));
    var k = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    function j(e, t) {
      return Object.prototype.hasOwnProperty.call(e, t);
    }
    ((e.exports.log = function () {
      var t, r;
      console.log(
        "%s - %s",
        ((t = new Date()),
        (r = [x(t.getHours()), x(t.getMinutes()), x(t.getSeconds())].join(":")),
        [t.getDate(), k[t.getMonth()], r].join(" ")),
        e.exports.format.apply(e.exports, arguments),
      );
    }),
      (e.exports.inherits = i("2jKWR")),
      (e.exports._extend = function (e, t) {
        if (!t || !E(t)) return e;
        for (var r = Object.keys(t), n = r.length; n--;) e[r[n]] = t[r[n]];
        return e;
      }));
    var P =
      "undefined" != typeof Symbol ? Symbol("util.promisify.custom") : void 0;
    function R(e, t) {
      if (!e) {
        var r = new Error("Promise was rejected with a falsy value");
        ((r.reason = e), (e = r));
      }
      return t(e);
    }
    ((e.exports.promisify = function (e) {
      if ("function" != typeof e)
        throw new TypeError('The "original" argument must be of type Function');
      if (P && e[P]) {
        var t;
        if ("function" != typeof (t = e[P]))
          throw new TypeError(
            'The "util.promisify.custom" argument must be of type Function',
          );
        return (
          Object.defineProperty(t, P, {
            value: t,
            enumerable: !1,
            writable: !1,
            configurable: !0,
          }),
          t
        );
      }
      function t() {
        for (
          var t,
            r,
            n = new Promise(function (e, n) {
              ((t = e), (r = n));
            }),
            o = [],
            i = 0;
          i < arguments.length;
          i++
        )
          o.push(arguments[i]);
        o.push(function (e, n) {
          e ? r(e) : t(n);
        });
        try {
          e.apply(this, o);
        } catch (e) {
          r(e);
        }
        return n;
      }
      return (
        Object.setPrototypeOf(t, Object.getPrototypeOf(e)),
        P &&
          Object.defineProperty(t, P, {
            value: t,
            enumerable: !1,
            writable: !1,
            configurable: !0,
          }),
        Object.defineProperties(t, n(e))
      );
    }),
      (e.exports.promisify.custom = P),
      (e.exports.callbackify = function (e) {
        if ("function" != typeof e)
          throw new TypeError(
            'The "original" argument must be of type Function',
          );
        function t() {
          for (var t = [], n = 0; n < arguments.length; n++)
            t.push(arguments[n]);
          var o = t.pop();
          if ("function" != typeof o)
            throw new TypeError("The last argument must be of type Function");
          var i = this,
            a = function () {
              return o.apply(i, arguments);
            };
          e.apply(this, t).then(
            function (e) {
              r.nextTick(a.bind(null, null, e));
            },
            function (e) {
              r.nextTick(R.bind(null, e, a));
            },
          );
        }
        return (
          Object.setPrototypeOf(t, Object.getPrototypeOf(e)),
          Object.defineProperties(t, n(e)),
          t
        );
      }));
  }),
  i.register("j2lhj", function (e, t) {
    var r = i("a8O6A"),
      n = i("6SdKO"),
      o = i("d2SCj"),
      a = i("37WjD");
    function u(e) {
      return e.call.bind(e);
    }
    var s = "undefined" != typeof BigInt,
      c = "undefined" != typeof Symbol,
      l = u(Object.prototype.toString),
      f = u(Number.prototype.valueOf),
      p = u(String.prototype.valueOf),
      h = u(Boolean.prototype.valueOf);
    if (s) var d = u(BigInt.prototype.valueOf);
    if (c) var y = u(Symbol.prototype.valueOf);
    function g(e, t) {
      if ("object" != typeof e) return !1;
      try {
        return (t(e), !0);
      } catch (e) {
        return !1;
      }
    }
    function v(e) {
      return "[object Map]" === l(e);
    }
    function m(e) {
      return "[object Set]" === l(e);
    }
    function b(e) {
      return "[object WeakMap]" === l(e);
    }
    function w(e) {
      return "[object WeakSet]" === l(e);
    }
    function E(e) {
      return "[object ArrayBuffer]" === l(e);
    }
    function _(e) {
      return (
        "undefined" != typeof ArrayBuffer &&
        (E.working ? E(e) : e instanceof ArrayBuffer)
      );
    }
    function S(e) {
      return "[object DataView]" === l(e);
    }
    function A(e) {
      return (
        "undefined" != typeof DataView &&
        (S.working ? S(e) : e instanceof DataView)
      );
    }
    ((e.exports.isArgumentsObject = r),
      (e.exports.isGeneratorFunction = n),
      (e.exports.isTypedArray = a),
      (e.exports.isPromise = function (e) {
        return (
          ("undefined" != typeof Promise && e instanceof Promise) ||
          (null !== e &&
            "object" == typeof e &&
            "function" == typeof e.then &&
            "function" == typeof e.catch)
        );
      }),
      (e.exports.isArrayBufferView = function (e) {
        return "undefined" != typeof ArrayBuffer && ArrayBuffer.isView
          ? ArrayBuffer.isView(e)
          : a(e) || A(e);
      }),
      (e.exports.isUint8Array = function (e) {
        return "Uint8Array" === o(e);
      }),
      (e.exports.isUint8ClampedArray = function (e) {
        return "Uint8ClampedArray" === o(e);
      }),
      (e.exports.isUint16Array = function (e) {
        return "Uint16Array" === o(e);
      }),
      (e.exports.isUint32Array = function (e) {
        return "Uint32Array" === o(e);
      }),
      (e.exports.isInt8Array = function (e) {
        return "Int8Array" === o(e);
      }),
      (e.exports.isInt16Array = function (e) {
        return "Int16Array" === o(e);
      }),
      (e.exports.isInt32Array = function (e) {
        return "Int32Array" === o(e);
      }),
      (e.exports.isFloat32Array = function (e) {
        return "Float32Array" === o(e);
      }),
      (e.exports.isFloat64Array = function (e) {
        return "Float64Array" === o(e);
      }),
      (e.exports.isBigInt64Array = function (e) {
        return "BigInt64Array" === o(e);
      }),
      (e.exports.isBigUint64Array = function (e) {
        return "BigUint64Array" === o(e);
      }),
      (v.working = "undefined" != typeof Map && v(new Map())),
      (e.exports.isMap = function (e) {
        return (
          "undefined" != typeof Map && (v.working ? v(e) : e instanceof Map)
        );
      }),
      (m.working = "undefined" != typeof Set && m(new Set())),
      (e.exports.isSet = function (e) {
        return (
          "undefined" != typeof Set && (m.working ? m(e) : e instanceof Set)
        );
      }),
      (b.working = "undefined" != typeof WeakMap && b(new WeakMap())),
      (e.exports.isWeakMap = function (e) {
        return (
          "undefined" != typeof WeakMap &&
          (b.working ? b(e) : e instanceof WeakMap)
        );
      }),
      (w.working = "undefined" != typeof WeakSet && w(new WeakSet())),
      (e.exports.isWeakSet = function (e) {
        return w(e);
      }),
      (E.working = "undefined" != typeof ArrayBuffer && E(new ArrayBuffer())),
      (e.exports.isArrayBuffer = _),
      (S.working =
        "undefined" != typeof ArrayBuffer &&
        "undefined" != typeof DataView &&
        S(new DataView(new ArrayBuffer(1), 0, 1))),
      (e.exports.isDataView = A));
    var O =
      "undefined" != typeof SharedArrayBuffer ? SharedArrayBuffer : void 0;
    function x(e) {
      return "[object SharedArrayBuffer]" === l(e);
    }
    function k(e) {
      return (
        void 0 !== O &&
        (void 0 === x.working && (x.working = x(new O())),
        x.working ? x(e) : e instanceof O)
      );
    }
    function j(e) {
      return g(e, f);
    }
    function P(e) {
      return g(e, p);
    }
    function R(e) {
      return g(e, h);
    }
    function T(e) {
      return s && g(e, d);
    }
    function I(e) {
      return c && g(e, y);
    }
    ((e.exports.isSharedArrayBuffer = k),
      (e.exports.isAsyncFunction = function (e) {
        return "[object AsyncFunction]" === l(e);
      }),
      (e.exports.isMapIterator = function (e) {
        return "[object Map Iterator]" === l(e);
      }),
      (e.exports.isSetIterator = function (e) {
        return "[object Set Iterator]" === l(e);
      }),
      (e.exports.isGeneratorObject = function (e) {
        return "[object Generator]" === l(e);
      }),
      (e.exports.isWebAssemblyCompiledModule = function (e) {
        return "[object WebAssembly.Module]" === l(e);
      }),
      (e.exports.isNumberObject = j),
      (e.exports.isStringObject = P),
      (e.exports.isBooleanObject = R),
      (e.exports.isBigIntObject = T),
      (e.exports.isSymbolObject = I),
      (e.exports.isBoxedPrimitive = function (e) {
        return j(e) || P(e) || R(e) || T(e) || I(e);
      }),
      (e.exports.isAnyArrayBuffer = function (e) {
        return "undefined" != typeof Uint8Array && (_(e) || k(e));
      }),
      ["isProxy", "isExternal", "isModuleNamespaceObject"].forEach(
        function (t) {
          Object.defineProperty(e.exports, t, {
            enumerable: !1,
            value: function () {
              throw new Error(t + " is not supported in userland");
            },
          });
        },
      ));
  }),
  i.register("a8O6A", function (e, t) {
    var r = i("faSrj")(),
      n = i("13V8u")("Object.prototype.toString"),
      o = function (e) {
        return (
          !(r && e && "object" == typeof e && Symbol.toStringTag in e) &&
          "[object Arguments]" === n(e)
        );
      },
      a = function (e) {
        return (
          !!o(e) ||
          (null !== e &&
            "object" == typeof e &&
            "number" == typeof e.length &&
            e.length >= 0 &&
            "[object Array]" !== n(e) &&
            "[object Function]" === n(e.callee))
        );
      },
      u = (function () {
        return o(arguments);
      })();
    ((o.isLegacyArguments = a), (e.exports = u ? o : a));
  }),
  i.register("faSrj", function (e, t) {
    var r = i("lMN9l");
    e.exports = function () {
      return r() && !!Symbol.toStringTag;
    };
  }),
  i.register("lMN9l", function (e, t) {
    e.exports = function () {
      if (
        "function" != typeof Symbol ||
        "function" != typeof Object.getOwnPropertySymbols
      )
        return !1;
      if ("symbol" == typeof Symbol.iterator) return !0;
      var e = {},
        t = Symbol("test"),
        r = Object(t);
      if ("string" == typeof t) return !1;
      if ("[object Symbol]" !== Object.prototype.toString.call(t)) return !1;
      if ("[object Symbol]" !== Object.prototype.toString.call(r)) return !1;
      for (t in ((e[t] = 42), e)) return !1;
      if ("function" == typeof Object.keys && 0 !== Object.keys(e).length)
        return !1;
      if (
        "function" == typeof Object.getOwnPropertyNames &&
        0 !== Object.getOwnPropertyNames(e).length
      )
        return !1;
      var n = Object.getOwnPropertySymbols(e);
      if (1 !== n.length || n[0] !== t) return !1;
      if (!Object.prototype.propertyIsEnumerable.call(e, t)) return !1;
      if ("function" == typeof Object.getOwnPropertyDescriptor) {
        var o = Object.getOwnPropertyDescriptor(e, t);
        if (42 !== o.value || !0 !== o.enumerable) return !1;
      }
      return !0;
    };
  }),
  i.register("13V8u", function (e, t) {
    var r = i("9d4ze"),
      n = i("aRt5r"),
      o = n(r("String.prototype.indexOf"));
    e.exports = function (e, t) {
      var i = r(e, !!t);
      return "function" == typeof i && o(e, ".prototype.") > -1 ? n(i) : i;
    };
  }),
  i.register("9d4ze", function (e, t) {
    var r,
      n = SyntaxError,
      o = Function,
      a = TypeError,
      u = function (e) {
        try {
          return o('"use strict"; return (' + e + ").constructor;")();
        } catch (e) {}
      },
      s = Object.getOwnPropertyDescriptor;
    if (s)
      try {
        s({}, "");
      } catch (e) {
        s = null;
      }
    var c = function () {
        throw new a();
      },
      l = s
        ? (function () {
            try {
              return c;
            } catch (e) {
              try {
                return s(arguments, "callee").get;
              } catch (e) {
                return c;
              }
            }
          })()
        : c,
      f = i("1cBXw")(),
      p =
        Object.getPrototypeOf ||
        function (e) {
          return e.__proto__;
        },
      h = {},
      d = "undefined" == typeof Uint8Array ? r : p(Uint8Array),
      y = {
        "%AggregateError%":
          "undefined" == typeof AggregateError ? r : AggregateError,
        "%Array%": Array,
        "%ArrayBuffer%": "undefined" == typeof ArrayBuffer ? r : ArrayBuffer,
        "%ArrayIteratorPrototype%": f ? p([][Symbol.iterator]()) : r,
        "%AsyncFromSyncIteratorPrototype%": r,
        "%AsyncFunction%": h,
        "%AsyncGenerator%": h,
        "%AsyncGeneratorFunction%": h,
        "%AsyncIteratorPrototype%": h,
        "%Atomics%": "undefined" == typeof Atomics ? r : Atomics,
        "%BigInt%": "undefined" == typeof BigInt ? r : BigInt,
        "%Boolean%": Boolean,
        "%DataView%": "undefined" == typeof DataView ? r : DataView,
        "%Date%": Date,
        "%decodeURI%": decodeURI,
        "%decodeURIComponent%": decodeURIComponent,
        "%encodeURI%": encodeURI,
        "%encodeURIComponent%": encodeURIComponent,
        "%Error%": Error,
        "%eval%": eval,
        "%EvalError%": EvalError,
        "%Float32Array%": "undefined" == typeof Float32Array ? r : Float32Array,
        "%Float64Array%": "undefined" == typeof Float64Array ? r : Float64Array,
        "%FinalizationRegistry%":
          "undefined" == typeof FinalizationRegistry ? r : FinalizationRegistry,
        "%Function%": o,
        "%GeneratorFunction%": h,
        "%Int8Array%": "undefined" == typeof Int8Array ? r : Int8Array,
        "%Int16Array%": "undefined" == typeof Int16Array ? r : Int16Array,
        "%Int32Array%": "undefined" == typeof Int32Array ? r : Int32Array,
        "%isFinite%": isFinite,
        "%isNaN%": isNaN,
        "%IteratorPrototype%": f ? p(p([][Symbol.iterator]())) : r,
        "%JSON%": "object" == typeof JSON ? JSON : r,
        "%Map%": "undefined" == typeof Map ? r : Map,
        "%MapIteratorPrototype%":
          "undefined" != typeof Map && f ? p(new Map()[Symbol.iterator]()) : r,
        "%Math%": Math,
        "%Number%": Number,
        "%Object%": Object,
        "%parseFloat%": parseFloat,
        "%parseInt%": parseInt,
        "%Promise%": "undefined" == typeof Promise ? r : Promise,
        "%Proxy%": "undefined" == typeof Proxy ? r : Proxy,
        "%RangeError%": RangeError,
        "%ReferenceError%": ReferenceError,
        "%Reflect%": "undefined" == typeof Reflect ? r : Reflect,
        "%RegExp%": RegExp,
        "%Set%": "undefined" == typeof Set ? r : Set,
        "%SetIteratorPrototype%":
          "undefined" != typeof Set && f ? p(new Set()[Symbol.iterator]()) : r,
        "%SharedArrayBuffer%":
          "undefined" == typeof SharedArrayBuffer ? r : SharedArrayBuffer,
        "%String%": String,
        "%StringIteratorPrototype%": f ? p(""[Symbol.iterator]()) : r,
        "%Symbol%": f ? Symbol : r,
        "%SyntaxError%": n,
        "%ThrowTypeError%": l,
        "%TypedArray%": d,
        "%TypeError%": a,
        "%Uint8Array%": "undefined" == typeof Uint8Array ? r : Uint8Array,
        "%Uint8ClampedArray%":
          "undefined" == typeof Uint8ClampedArray ? r : Uint8ClampedArray,
        "%Uint16Array%": "undefined" == typeof Uint16Array ? r : Uint16Array,
        "%Uint32Array%": "undefined" == typeof Uint32Array ? r : Uint32Array,
        "%URIError%": URIError,
        "%WeakMap%": "undefined" == typeof WeakMap ? r : WeakMap,
        "%WeakRef%": "undefined" == typeof WeakRef ? r : WeakRef,
        "%WeakSet%": "undefined" == typeof WeakSet ? r : WeakSet,
      },
      g = function e(t) {
        var r;
        if ("%AsyncFunction%" === t) r = u("async function () {}");
        else if ("%GeneratorFunction%" === t) r = u("function* () {}");
        else if ("%AsyncGeneratorFunction%" === t)
          r = u("async function* () {}");
        else if ("%AsyncGenerator%" === t) {
          var n = e("%AsyncGeneratorFunction%");
          n && (r = n.prototype);
        } else if ("%AsyncIteratorPrototype%" === t) {
          var o = e("%AsyncGenerator%");
          o && (r = p(o.prototype));
        }
        return ((y[t] = r), r);
      },
      v = {
        "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
        "%ArrayPrototype%": ["Array", "prototype"],
        "%ArrayProto_entries%": ["Array", "prototype", "entries"],
        "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
        "%ArrayProto_keys%": ["Array", "prototype", "keys"],
        "%ArrayProto_values%": ["Array", "prototype", "values"],
        "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
        "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
        "%AsyncGeneratorPrototype%": [
          "AsyncGeneratorFunction",
          "prototype",
          "prototype",
        ],
        "%BooleanPrototype%": ["Boolean", "prototype"],
        "%DataViewPrototype%": ["DataView", "prototype"],
        "%DatePrototype%": ["Date", "prototype"],
        "%ErrorPrototype%": ["Error", "prototype"],
        "%EvalErrorPrototype%": ["EvalError", "prototype"],
        "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
        "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
        "%FunctionPrototype%": ["Function", "prototype"],
        "%Generator%": ["GeneratorFunction", "prototype"],
        "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
        "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
        "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
        "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
        "%JSONParse%": ["JSON", "parse"],
        "%JSONStringify%": ["JSON", "stringify"],
        "%MapPrototype%": ["Map", "prototype"],
        "%NumberPrototype%": ["Number", "prototype"],
        "%ObjectPrototype%": ["Object", "prototype"],
        "%ObjProto_toString%": ["Object", "prototype", "toString"],
        "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
        "%PromisePrototype%": ["Promise", "prototype"],
        "%PromiseProto_then%": ["Promise", "prototype", "then"],
        "%Promise_all%": ["Promise", "all"],
        "%Promise_reject%": ["Promise", "reject"],
        "%Promise_resolve%": ["Promise", "resolve"],
        "%RangeErrorPrototype%": ["RangeError", "prototype"],
        "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
        "%RegExpPrototype%": ["RegExp", "prototype"],
        "%SetPrototype%": ["Set", "prototype"],
        "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
        "%StringPrototype%": ["String", "prototype"],
        "%SymbolPrototype%": ["Symbol", "prototype"],
        "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
        "%TypedArrayPrototype%": ["TypedArray", "prototype"],
        "%TypeErrorPrototype%": ["TypeError", "prototype"],
        "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
        "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
        "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
        "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
        "%URIErrorPrototype%": ["URIError", "prototype"],
        "%WeakMapPrototype%": ["WeakMap", "prototype"],
        "%WeakSetPrototype%": ["WeakSet", "prototype"],
      },
      m = i("cE7Kt"),
      b = i("eeEOJ"),
      w = m.call(Function.call, Array.prototype.concat),
      E = m.call(Function.apply, Array.prototype.splice),
      _ = m.call(Function.call, String.prototype.replace),
      S = m.call(Function.call, String.prototype.slice),
      A =
        /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g,
      O = /\\(\\)?/g,
      x = function (e, t) {
        var r,
          o = e;
        if ((b(v, o) && (o = "%" + (r = v[o])[0] + "%"), b(y, o))) {
          var i = y[o];
          if ((i === h && (i = g(o)), void 0 === i && !t))
            throw new a(
              "intrinsic " +
                e +
                " exists, but is not available. Please file an issue!",
            );
          return { alias: r, name: o, value: i };
        }
        throw new n("intrinsic " + e + " does not exist!");
      };
    e.exports = function (e, t) {
      if ("string" != typeof e || 0 === e.length)
        throw new a("intrinsic name must be a non-empty string");
      if (arguments.length > 1 && "boolean" != typeof t)
        throw new a('"allowMissing" argument must be a boolean');
      var r = (function (e) {
          var t = S(e, 0, 1),
            r = S(e, -1);
          if ("%" === t && "%" !== r)
            throw new n("invalid intrinsic syntax, expected closing `%`");
          if ("%" === r && "%" !== t)
            throw new n("invalid intrinsic syntax, expected opening `%`");
          var o = [];
          return (
            _(e, A, function (e, t, r, n) {
              o[o.length] = r ? _(n, O, "$1") : t || e;
            }),
            o
          );
        })(e),
        o = r.length > 0 ? r[0] : "",
        i = x("%" + o + "%", t),
        u = i.name,
        c = i.value,
        l = !1,
        f = i.alias;
      f && ((o = f[0]), E(r, w([0, 1], f)));
      for (var p = 1, h = !0; p < r.length; p += 1) {
        var d = r[p],
          g = S(d, 0, 1),
          v = S(d, -1);
        if (
          ('"' === g ||
            "'" === g ||
            "`" === g ||
            '"' === v ||
            "'" === v ||
            "`" === v) &&
          g !== v
        )
          throw new n("property names with quotes must have matching quotes");
        if (
          (("constructor" !== d && h) || (l = !0),
          b(y, (u = "%" + (o += "." + d) + "%")))
        )
          c = y[u];
        else if (null != c) {
          if (!(d in c)) {
            if (!t)
              throw new a(
                "base intrinsic for " +
                  e +
                  " exists, but the property is not available.",
              );
            return;
          }
          if (s && p + 1 >= r.length) {
            var m = s(c, d);
            c =
              (h = !!m) && "get" in m && !("originalValue" in m.get)
                ? m.get
                : c[d];
          } else ((h = b(c, d)), (c = c[d]));
          h && !l && (y[u] = c);
        }
      }
      return c;
    };
  }),
  i.register("1cBXw", function (e, t) {
    var n = r.Symbol,
      o = i("douCD");
    e.exports = function () {
      return (
        "function" == typeof n &&
        "function" == typeof Symbol &&
        "symbol" == typeof n("foo") &&
        "symbol" == typeof Symbol("bar") &&
        o()
      );
    };
  }),
  i.register("douCD", function (e, t) {
    e.exports = function () {
      if (
        "function" != typeof Symbol ||
        "function" != typeof Object.getOwnPropertySymbols
      )
        return !1;
      if ("symbol" == typeof Symbol.iterator) return !0;
      var e = {},
        t = Symbol("test"),
        r = Object(t);
      if ("string" == typeof t) return !1;
      if ("[object Symbol]" !== Object.prototype.toString.call(t)) return !1;
      if ("[object Symbol]" !== Object.prototype.toString.call(r)) return !1;
      for (t in ((e[t] = 42), e)) return !1;
      if ("function" == typeof Object.keys && 0 !== Object.keys(e).length)
        return !1;
      if (
        "function" == typeof Object.getOwnPropertyNames &&
        0 !== Object.getOwnPropertyNames(e).length
      )
        return !1;
      var n = Object.getOwnPropertySymbols(e);
      if (1 !== n.length || n[0] !== t) return !1;
      if (!Object.prototype.propertyIsEnumerable.call(e, t)) return !1;
      if ("function" == typeof Object.getOwnPropertyDescriptor) {
        var o = Object.getOwnPropertyDescriptor(e, t);
        if (42 !== o.value || !0 !== o.enumerable) return !1;
      }
      return !0;
    };
  }),
  i.register("cE7Kt", function (e, t) {
    var r = i("aRSA3");
    e.exports = Function.prototype.bind || r;
  }),
  i.register("aRSA3", function (e, t) {
    var r = Array.prototype.slice,
      n = Object.prototype.toString;
    e.exports = function (e) {
      var t = this;
      if ("function" != typeof t || "[object Function]" !== n.call(t))
        throw new TypeError(
          "Function.prototype.bind called on incompatible " + t,
        );
      for (
        var o,
          i = r.call(arguments, 1),
          a = Math.max(0, t.length - i.length),
          u = [],
          s = 0;
        s < a;
        s++
      )
        u.push("$" + s);
      if (
        ((o = Function(
          "binder",
          "return function (" +
            u.join(",") +
            "){ return binder.apply(this,arguments); }",
        )(function () {
          if (this instanceof o) {
            var n = t.apply(this, i.concat(r.call(arguments)));
            return Object(n) === n ? n : this;
          }
          return t.apply(e, i.concat(r.call(arguments)));
        })),
        t.prototype)
      ) {
        var c = function () {};
        ((c.prototype = t.prototype),
          (o.prototype = new c()),
          (c.prototype = null));
      }
      return o;
    };
  }),
  i.register("eeEOJ", function (e, t) {
    var r = i("kkBwW");
    e.exports = r.call(Function.call, Object.prototype.hasOwnProperty);
  }),
  i.register("kkBwW", function (e, t) {
    var r = i("h63n4");
    e.exports = Function.prototype.bind || r;
  }),
  i.register("h63n4", function (e, t) {
    var r = Array.prototype.slice,
      n = Object.prototype.toString;
    e.exports = function (e) {
      var t = this;
      if ("function" != typeof t || "[object Function]" !== n.call(t))
        throw new TypeError(
          "Function.prototype.bind called on incompatible " + t,
        );
      for (
        var o,
          i = r.call(arguments, 1),
          a = Math.max(0, t.length - i.length),
          u = [],
          s = 0;
        s < a;
        s++
      )
        u.push("$" + s);
      if (
        ((o = Function(
          "binder",
          "return function (" +
            u.join(",") +
            "){ return binder.apply(this,arguments); }",
        )(function () {
          if (this instanceof o) {
            var n = t.apply(this, i.concat(r.call(arguments)));
            return Object(n) === n ? n : this;
          }
          return t.apply(e, i.concat(r.call(arguments)));
        })),
        t.prototype)
      ) {
        var c = function () {};
        ((c.prototype = t.prototype),
          (o.prototype = new c()),
          (c.prototype = null));
      }
      return o;
    };
  }),
  i.register("aRt5r", function (e, t) {
    var r = i("cE7Kt"),
      n = i("9d4ze"),
      o = n("%Function.prototype.apply%"),
      a = n("%Function.prototype.call%"),
      u = n("%Reflect.apply%", !0) || r.call(a, o),
      s = n("%Object.getOwnPropertyDescriptor%", !0),
      c = n("%Object.defineProperty%", !0),
      l = n("%Math.max%");
    if (c)
      try {
        c({}, "a", { value: 1 });
      } catch (e) {
        c = null;
      }
    e.exports = function (e) {
      var t = u(r, a, arguments);
      s &&
        c &&
        s(t, "length").configurable &&
        c(t, "length", { value: 1 + l(0, e.length - (arguments.length - 1)) });
      return t;
    };
    var f = function () {
      return u(r, o, arguments);
    };
    c ? c(e.exports, "apply", { value: f }) : (e.exports.apply = f);
  }),
  i.register("6SdKO", function (e, t) {
    var r,
      n = Object.prototype.toString,
      o = Function.prototype.toString,
      a = /^\s*(?:function)?\*/,
      u = i("faSrj")(),
      s = Object.getPrototypeOf;
    e.exports = function (e) {
      if ("function" != typeof e) return !1;
      if (a.test(o.call(e))) return !0;
      if (!u) return "[object GeneratorFunction]" === n.call(e);
      if (!s) return !1;
      if (void 0 === r) {
        var t = (function () {
          if (!u) return !1;
          try {
            return Function("return function*() {}")();
          } catch (e) {}
        })();
        r = !!t && s(t);
      }
      return s(e) === r;
    };
  }),
  i.register("d2SCj", function (e, t) {
    var n = i("hirYr"),
      o = i("lOWrF"),
      a = i("13V8u"),
      u = i("5V65i"),
      s = a("Object.prototype.toString"),
      c = i("faSrj")(),
      l = "undefined" == typeof globalThis ? r : globalThis,
      f = o(),
      p = a("String.prototype.slice"),
      h = {},
      d = Object.getPrototypeOf;
    c &&
      u &&
      d &&
      n(f, function (e) {
        if ("function" == typeof l[e]) {
          var t = new l[e]();
          if (Symbol.toStringTag in t) {
            var r = d(t),
              n = u(r, Symbol.toStringTag);
            if (!n) {
              var o = d(r);
              n = u(o, Symbol.toStringTag);
            }
            h[e] = n.get;
          }
        }
      });
    var y = i("37WjD");
    e.exports = function (e) {
      return (
        !!y(e) &&
        (c && Symbol.toStringTag in e
          ? (function (e) {
              var t = !1;
              return (
                n(h, function (r, n) {
                  if (!t)
                    try {
                      var o = r.call(e);
                      o === n && (t = o);
                    } catch (e) {}
                }),
                t
              );
            })(e)
          : p(s(e), 8, -1))
      );
    };
  }),
  i.register("hirYr", function (e, t) {
    var r = i("6Lnt1"),
      n = Object.prototype.toString,
      o = Object.prototype.hasOwnProperty;
    e.exports = function (e, t, i) {
      if (!r(t)) throw new TypeError("iterator must be a function");
      var a;
      (arguments.length >= 3 && (a = i),
        "[object Array]" === n.call(e)
          ? (function (e, t, r) {
              for (var n = 0, i = e.length; n < i; n++)
                o.call(e, n) &&
                  (null == r ? t(e[n], n, e) : t.call(r, e[n], n, e));
            })(e, t, a)
          : "string" == typeof e
            ? (function (e, t, r) {
                for (var n = 0, o = e.length; n < o; n++)
                  null == r
                    ? t(e.charAt(n), n, e)
                    : t.call(r, e.charAt(n), n, e);
              })(e, t, a)
            : (function (e, t, r) {
                for (var n in e)
                  o.call(e, n) &&
                    (null == r ? t(e[n], n, e) : t.call(r, e[n], n, e));
              })(e, t, a));
    };
  }),
  i.register("6Lnt1", function (e, t) {
    var r,
      n,
      o = Function.prototype.toString,
      i = "object" == typeof Reflect && null !== Reflect && Reflect.apply;
    if ("function" == typeof i && "function" == typeof Object.defineProperty)
      try {
        ((r = Object.defineProperty({}, "length", {
          get: function () {
            throw n;
          },
        })),
          (n = {}),
          i(
            function () {
              throw 42;
            },
            null,
            r,
          ));
      } catch (e) {
        e !== n && (i = null);
      }
    else i = null;
    var a = /^\s*class\b/,
      u = function (e) {
        try {
          var t = o.call(e);
          return a.test(t);
        } catch (e) {
          return !1;
        }
      },
      s = function (e) {
        try {
          return !u(e) && (o.call(e), !0);
        } catch (e) {
          return !1;
        }
      },
      c = Object.prototype.toString,
      l = "function" == typeof Symbol && !!Symbol.toStringTag,
      f = !(0 in [,]),
      p = function () {
        return !1;
      };
    if ("object" == typeof document) {
      var h = document.all;
      c.call(h) === c.call(document.all) &&
        (p = function (e) {
          if ((f || !e) && (void 0 === e || "object" == typeof e))
            try {
              var t = c.call(e);
              return (
                ("[object HTMLAllCollection]" === t ||
                  "[object HTML document.all class]" === t ||
                  "[object HTMLCollection]" === t ||
                  "[object Object]" === t) &&
                null == e("")
              );
            } catch (e) {}
          return !1;
        });
    }
    e.exports = i
      ? function (e) {
          if (p(e)) return !0;
          if (!e) return !1;
          if ("function" != typeof e && "object" != typeof e) return !1;
          try {
            i(e, null, r);
          } catch (e) {
            if (e !== n) return !1;
          }
          return !u(e) && s(e);
        }
      : function (e) {
          if (p(e)) return !0;
          if (!e) return !1;
          if ("function" != typeof e && "object" != typeof e) return !1;
          if (l) return s(e);
          if (u(e)) return !1;
          var t = c.call(e);
          return (
            !(
              "[object Function]" !== t &&
              "[object GeneratorFunction]" !== t &&
              !/^\[object HTML/.test(t)
            ) && s(e)
          );
        };
  }),
  i.register("lOWrF", function (e, t) {
    var n = [
        "BigInt64Array",
        "BigUint64Array",
        "Float32Array",
        "Float64Array",
        "Int16Array",
        "Int32Array",
        "Int8Array",
        "Uint16Array",
        "Uint32Array",
        "Uint8Array",
        "Uint8ClampedArray",
      ],
      o = "undefined" == typeof globalThis ? r : globalThis;
    e.exports = function () {
      for (var e = [], t = 0; t < n.length; t++)
        "function" == typeof o[n[t]] && (e[e.length] = n[t]);
      return e;
    };
  }),
  i.register("5V65i", function (e, t) {
    var r = i("iN2Py")("%Object.getOwnPropertyDescriptor%", !0);
    if (r)
      try {
        r([], "length");
      } catch (e) {
        r = null;
      }
    e.exports = r;
  }),
  i.register("iN2Py", function (e, t) {
    var r,
      n = SyntaxError,
      o = Function,
      a = TypeError,
      u = function (e) {
        try {
          return o('"use strict"; return (' + e + ").constructor;")();
        } catch (e) {}
      },
      s = Object.getOwnPropertyDescriptor;
    if (s)
      try {
        s({}, "");
      } catch (e) {
        s = null;
      }
    var c = function () {
        throw new a();
      },
      l = s
        ? (function () {
            try {
              return c;
            } catch (e) {
              try {
                return s(arguments, "callee").get;
              } catch (e) {
                return c;
              }
            }
          })()
        : c,
      f = i("5LyZQ")(),
      p =
        Object.getPrototypeOf ||
        function (e) {
          return e.__proto__;
        },
      h = {},
      d = "undefined" == typeof Uint8Array ? r : p(Uint8Array),
      y = {
        "%AggregateError%":
          "undefined" == typeof AggregateError ? r : AggregateError,
        "%Array%": Array,
        "%ArrayBuffer%": "undefined" == typeof ArrayBuffer ? r : ArrayBuffer,
        "%ArrayIteratorPrototype%": f ? p([][Symbol.iterator]()) : r,
        "%AsyncFromSyncIteratorPrototype%": r,
        "%AsyncFunction%": h,
        "%AsyncGenerator%": h,
        "%AsyncGeneratorFunction%": h,
        "%AsyncIteratorPrototype%": h,
        "%Atomics%": "undefined" == typeof Atomics ? r : Atomics,
        "%BigInt%": "undefined" == typeof BigInt ? r : BigInt,
        "%BigInt64Array%":
          "undefined" == typeof BigInt64Array ? r : BigInt64Array,
        "%BigUint64Array%":
          "undefined" == typeof BigUint64Array ? r : BigUint64Array,
        "%Boolean%": Boolean,
        "%DataView%": "undefined" == typeof DataView ? r : DataView,
        "%Date%": Date,
        "%decodeURI%": decodeURI,
        "%decodeURIComponent%": decodeURIComponent,
        "%encodeURI%": encodeURI,
        "%encodeURIComponent%": encodeURIComponent,
        "%Error%": Error,
        "%eval%": eval,
        "%EvalError%": EvalError,
        "%Float32Array%": "undefined" == typeof Float32Array ? r : Float32Array,
        "%Float64Array%": "undefined" == typeof Float64Array ? r : Float64Array,
        "%FinalizationRegistry%":
          "undefined" == typeof FinalizationRegistry ? r : FinalizationRegistry,
        "%Function%": o,
        "%GeneratorFunction%": h,
        "%Int8Array%": "undefined" == typeof Int8Array ? r : Int8Array,
        "%Int16Array%": "undefined" == typeof Int16Array ? r : Int16Array,
        "%Int32Array%": "undefined" == typeof Int32Array ? r : Int32Array,
        "%isFinite%": isFinite,
        "%isNaN%": isNaN,
        "%IteratorPrototype%": f ? p(p([][Symbol.iterator]())) : r,
        "%JSON%": "object" == typeof JSON ? JSON : r,
        "%Map%": "undefined" == typeof Map ? r : Map,
        "%MapIteratorPrototype%":
          "undefined" != typeof Map && f ? p(new Map()[Symbol.iterator]()) : r,
        "%Math%": Math,
        "%Number%": Number,
        "%Object%": Object,
        "%parseFloat%": parseFloat,
        "%parseInt%": parseInt,
        "%Promise%": "undefined" == typeof Promise ? r : Promise,
        "%Proxy%": "undefined" == typeof Proxy ? r : Proxy,
        "%RangeError%": RangeError,
        "%ReferenceError%": ReferenceError,
        "%Reflect%": "undefined" == typeof Reflect ? r : Reflect,
        "%RegExp%": RegExp,
        "%Set%": "undefined" == typeof Set ? r : Set,
        "%SetIteratorPrototype%":
          "undefined" != typeof Set && f ? p(new Set()[Symbol.iterator]()) : r,
        "%SharedArrayBuffer%":
          "undefined" == typeof SharedArrayBuffer ? r : SharedArrayBuffer,
        "%String%": String,
        "%StringIteratorPrototype%": f ? p(""[Symbol.iterator]()) : r,
        "%Symbol%": f ? Symbol : r,
        "%SyntaxError%": n,
        "%ThrowTypeError%": l,
        "%TypedArray%": d,
        "%TypeError%": a,
        "%Uint8Array%": "undefined" == typeof Uint8Array ? r : Uint8Array,
        "%Uint8ClampedArray%":
          "undefined" == typeof Uint8ClampedArray ? r : Uint8ClampedArray,
        "%Uint16Array%": "undefined" == typeof Uint16Array ? r : Uint16Array,
        "%Uint32Array%": "undefined" == typeof Uint32Array ? r : Uint32Array,
        "%URIError%": URIError,
        "%WeakMap%": "undefined" == typeof WeakMap ? r : WeakMap,
        "%WeakRef%": "undefined" == typeof WeakRef ? r : WeakRef,
        "%WeakSet%": "undefined" == typeof WeakSet ? r : WeakSet,
      };
    try {
      null.error;
    } catch (e) {
      var g = p(p(e));
      y["%Error.prototype%"] = g;
    }
    var v = function e(t) {
        var r;
        if ("%AsyncFunction%" === t) r = u("async function () {}");
        else if ("%GeneratorFunction%" === t) r = u("function* () {}");
        else if ("%AsyncGeneratorFunction%" === t)
          r = u("async function* () {}");
        else if ("%AsyncGenerator%" === t) {
          var n = e("%AsyncGeneratorFunction%");
          n && (r = n.prototype);
        } else if ("%AsyncIteratorPrototype%" === t) {
          var o = e("%AsyncGenerator%");
          o && (r = p(o.prototype));
        }
        return ((y[t] = r), r);
      },
      m = {
        "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
        "%ArrayPrototype%": ["Array", "prototype"],
        "%ArrayProto_entries%": ["Array", "prototype", "entries"],
        "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
        "%ArrayProto_keys%": ["Array", "prototype", "keys"],
        "%ArrayProto_values%": ["Array", "prototype", "values"],
        "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
        "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
        "%AsyncGeneratorPrototype%": [
          "AsyncGeneratorFunction",
          "prototype",
          "prototype",
        ],
        "%BooleanPrototype%": ["Boolean", "prototype"],
        "%DataViewPrototype%": ["DataView", "prototype"],
        "%DatePrototype%": ["Date", "prototype"],
        "%ErrorPrototype%": ["Error", "prototype"],
        "%EvalErrorPrototype%": ["EvalError", "prototype"],
        "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
        "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
        "%FunctionPrototype%": ["Function", "prototype"],
        "%Generator%": ["GeneratorFunction", "prototype"],
        "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
        "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
        "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
        "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
        "%JSONParse%": ["JSON", "parse"],
        "%JSONStringify%": ["JSON", "stringify"],
        "%MapPrototype%": ["Map", "prototype"],
        "%NumberPrototype%": ["Number", "prototype"],
        "%ObjectPrototype%": ["Object", "prototype"],
        "%ObjProto_toString%": ["Object", "prototype", "toString"],
        "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
        "%PromisePrototype%": ["Promise", "prototype"],
        "%PromiseProto_then%": ["Promise", "prototype", "then"],
        "%Promise_all%": ["Promise", "all"],
        "%Promise_reject%": ["Promise", "reject"],
        "%Promise_resolve%": ["Promise", "resolve"],
        "%RangeErrorPrototype%": ["RangeError", "prototype"],
        "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
        "%RegExpPrototype%": ["RegExp", "prototype"],
        "%SetPrototype%": ["Set", "prototype"],
        "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
        "%StringPrototype%": ["String", "prototype"],
        "%SymbolPrototype%": ["Symbol", "prototype"],
        "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
        "%TypedArrayPrototype%": ["TypedArray", "prototype"],
        "%TypeErrorPrototype%": ["TypeError", "prototype"],
        "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
        "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
        "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
        "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
        "%URIErrorPrototype%": ["URIError", "prototype"],
        "%WeakMapPrototype%": ["WeakMap", "prototype"],
        "%WeakSetPrototype%": ["WeakSet", "prototype"],
      },
      b = i("8fgF9"),
      w = i("eeEOJ"),
      E = b.call(Function.call, Array.prototype.concat),
      _ = b.call(Function.apply, Array.prototype.splice),
      S = b.call(Function.call, String.prototype.replace),
      A = b.call(Function.call, String.prototype.slice),
      O = b.call(Function.call, RegExp.prototype.exec),
      x =
        /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g,
      k = /\\(\\)?/g,
      j = function (e, t) {
        var r,
          o = e;
        if ((w(m, o) && (o = "%" + (r = m[o])[0] + "%"), w(y, o))) {
          var i = y[o];
          if ((i === h && (i = v(o)), void 0 === i && !t))
            throw new a(
              "intrinsic " +
                e +
                " exists, but is not available. Please file an issue!",
            );
          return { alias: r, name: o, value: i };
        }
        throw new n("intrinsic " + e + " does not exist!");
      };
    e.exports = function (e, t) {
      if ("string" != typeof e || 0 === e.length)
        throw new a("intrinsic name must be a non-empty string");
      if (arguments.length > 1 && "boolean" != typeof t)
        throw new a('"allowMissing" argument must be a boolean');
      if (null === O(/^%?[^%]*%?$/, e))
        throw new n(
          "`%` may not be present anywhere but at the beginning and end of the intrinsic name",
        );
      var r = (function (e) {
          var t = A(e, 0, 1),
            r = A(e, -1);
          if ("%" === t && "%" !== r)
            throw new n("invalid intrinsic syntax, expected closing `%`");
          if ("%" === r && "%" !== t)
            throw new n("invalid intrinsic syntax, expected opening `%`");
          var o = [];
          return (
            S(e, x, function (e, t, r, n) {
              o[o.length] = r ? S(n, k, "$1") : t || e;
            }),
            o
          );
        })(e),
        o = r.length > 0 ? r[0] : "",
        i = j("%" + o + "%", t),
        u = i.name,
        c = i.value,
        l = !1,
        f = i.alias;
      f && ((o = f[0]), _(r, E([0, 1], f)));
      for (var p = 1, h = !0; p < r.length; p += 1) {
        var d = r[p],
          g = A(d, 0, 1),
          v = A(d, -1);
        if (
          ('"' === g ||
            "'" === g ||
            "`" === g ||
            '"' === v ||
            "'" === v ||
            "`" === v) &&
          g !== v
        )
          throw new n("property names with quotes must have matching quotes");
        if (
          (("constructor" !== d && h) || (l = !0),
          w(y, (u = "%" + (o += "." + d) + "%")))
        )
          c = y[u];
        else if (null != c) {
          if (!(d in c)) {
            if (!t)
              throw new a(
                "base intrinsic for " +
                  e +
                  " exists, but the property is not available.",
              );
            return;
          }
          if (s && p + 1 >= r.length) {
            var m = s(c, d);
            c =
              (h = !!m) && "get" in m && !("originalValue" in m.get)
                ? m.get
                : c[d];
          } else ((h = w(c, d)), (c = c[d]));
          h && !l && (y[u] = c);
        }
      }
      return c;
    };
  }),
  i.register("5LyZQ", function (e, t) {
    var r = "undefined" != typeof Symbol && Symbol,
      n = i("al0Qf");
    e.exports = function () {
      return (
        "function" == typeof r &&
        "function" == typeof Symbol &&
        "symbol" == typeof r("foo") &&
        "symbol" == typeof Symbol("bar") &&
        n()
      );
    };
  }),
  i.register("al0Qf", function (e, t) {
    e.exports = function () {
      if (
        "function" != typeof Symbol ||
        "function" != typeof Object.getOwnPropertySymbols
      )
        return !1;
      if ("symbol" == typeof Symbol.iterator) return !0;
      var e = {},
        t = Symbol("test"),
        r = Object(t);
      if ("string" == typeof t) return !1;
      if ("[object Symbol]" !== Object.prototype.toString.call(t)) return !1;
      if ("[object Symbol]" !== Object.prototype.toString.call(r)) return !1;
      for (t in ((e[t] = 42), e)) return !1;
      if ("function" == typeof Object.keys && 0 !== Object.keys(e).length)
        return !1;
      if (
        "function" == typeof Object.getOwnPropertyNames &&
        0 !== Object.getOwnPropertyNames(e).length
      )
        return !1;
      var n = Object.getOwnPropertySymbols(e);
      if (1 !== n.length || n[0] !== t) return !1;
      if (!Object.prototype.propertyIsEnumerable.call(e, t)) return !1;
      if ("function" == typeof Object.getOwnPropertyDescriptor) {
        var o = Object.getOwnPropertyDescriptor(e, t);
        if (42 !== o.value || !0 !== o.enumerable) return !1;
      }
      return !0;
    };
  }),
  i.register("8fgF9", function (e, t) {
    var r = i("8jcie");
    e.exports = Function.prototype.bind || r;
  }),
  i.register("8jcie", function (e, t) {
    var r = Array.prototype.slice,
      n = Object.prototype.toString;
    e.exports = function (e) {
      var t = this;
      if ("function" != typeof t || "[object Function]" !== n.call(t))
        throw new TypeError(
          "Function.prototype.bind called on incompatible " + t,
        );
      for (
        var o,
          i = r.call(arguments, 1),
          a = Math.max(0, t.length - i.length),
          u = [],
          s = 0;
        s < a;
        s++
      )
        u.push("$" + s);
      if (
        ((o = Function(
          "binder",
          "return function (" +
            u.join(",") +
            "){ return binder.apply(this,arguments); }",
        )(function () {
          if (this instanceof o) {
            var n = t.apply(this, i.concat(r.call(arguments)));
            return Object(n) === n ? n : this;
          }
          return t.apply(e, i.concat(r.call(arguments)));
        })),
        t.prototype)
      ) {
        var c = function () {};
        ((c.prototype = t.prototype),
          (o.prototype = new c()),
          (c.prototype = null));
      }
      return o;
    };
  }),
  i.register("37WjD", function (e, t) {
    var n = i("hirYr"),
      o = i("lOWrF"),
      a = i("13V8u"),
      u = a("Object.prototype.toString"),
      s = i("faSrj")(),
      c = i("5V65i"),
      l = "undefined" == typeof globalThis ? r : globalThis,
      f = o(),
      p =
        a("Array.prototype.indexOf", !0) ||
        function (e, t) {
          for (var r = 0; r < e.length; r += 1) if (e[r] === t) return r;
          return -1;
        },
      h = a("String.prototype.slice"),
      d = {},
      y = Object.getPrototypeOf;
    s &&
      c &&
      y &&
      n(f, function (e) {
        var t = new l[e]();
        if (Symbol.toStringTag in t) {
          var r = y(t),
            n = c(r, Symbol.toStringTag);
          if (!n) {
            var o = y(r);
            n = c(o, Symbol.toStringTag);
          }
          d[e] = n.get;
        }
      });
    e.exports = function (e) {
      if (!e || "object" != typeof e) return !1;
      if (!s || !(Symbol.toStringTag in e)) {
        var t = h(u(e), 8, -1);
        return p(f, t) > -1;
      }
      return (
        !!c &&
        (function (e) {
          var t = !1;
          return (
            n(d, function (r, n) {
              if (!t)
                try {
                  t = r.call(e) === n;
                } catch (e) {}
            }),
            t
          );
        })(e)
      );
    };
  }),
  i.register("8r9EX", function (e, t) {
    e.exports = function (e) {
      return (
        e &&
        "object" == typeof e &&
        "function" == typeof e.copy &&
        "function" == typeof e.fill &&
        "function" == typeof e.readUInt8
      );
    };
  }),
  i.register("2jKWR", function (e, t) {
    "function" == typeof Object.create
      ? (e.exports = function (e, t) {
          t &&
            ((e.super_ = t),
            (e.prototype = Object.create(t.prototype, {
              constructor: {
                value: e,
                enumerable: !1,
                writable: !0,
                configurable: !0,
              },
            })));
        })
      : (e.exports = function (e, t) {
          if (t) {
            e.super_ = t;
            var r = function () {};
            ((r.prototype = t.prototype),
              (e.prototype = new r()),
              (e.prototype.constructor = e));
          }
        });
  }),
  i.register("clFY1", function (e, t) {
    var r = i("kIky1");
    function n(e, t, r) {
      return (
        t in e
          ? Object.defineProperty(e, t, {
              value: r,
              enumerable: !0,
              configurable: !0,
              writable: !0,
            })
          : (e[t] = r),
        e
      );
    }
    function o(e, t) {
      for (var r = 0; r < t.length; r++) {
        var n = t[r];
        ((n.enumerable = n.enumerable || !1),
          (n.configurable = !0),
          "value" in n && (n.writable = !0),
          Object.defineProperty(e, n.key, n));
      }
    }
    function a(e, t) {
      return !t || ("object" !== p(t) && "function" != typeof t) ? u(e) : t;
    }
    function u(e) {
      if (void 0 === e)
        throw new ReferenceError(
          "this hasn't been initialised - super() hasn't been called",
        );
      return e;
    }
    function s(e) {
      var t = "function" == typeof Map ? new Map() : void 0;
      return (
        (s = function (e) {
          if (
            null === e ||
            ((r = e), -1 === Function.toString.call(r).indexOf("[native code]"))
          )
            return e;
          var r;
          if ("function" != typeof e)
            throw new TypeError(
              "Super expression must either be null or a function",
            );
          if (void 0 !== t) {
            if (t.has(e)) return t.get(e);
            t.set(e, n);
          }
          function n() {
            return c(e, arguments, f(this).constructor);
          }
          return (
            (n.prototype = Object.create(e.prototype, {
              constructor: {
                value: n,
                enumerable: !1,
                writable: !0,
                configurable: !0,
              },
            })),
            l(n, e)
          );
        }),
        s(e)
      );
    }
    function c(e, t, r) {
      return (
        (c = (function () {
          if ("undefined" == typeof Reflect || !Reflect.construct) return !1;
          if (Reflect.construct.sham) return !1;
          if ("function" == typeof Proxy) return !0;
          try {
            return (
              Date.prototype.toString.call(
                Reflect.construct(Date, [], function () {}),
              ),
              !0
            );
          } catch (e) {
            return !1;
          }
        })()
          ? Reflect.construct
          : function (e, t, r) {
              var n = [null];
              n.push.apply(n, t);
              var o = new (Function.bind.apply(e, n))();
              return (r && l(o, r.prototype), o);
            }),
        c.apply(null, arguments)
      );
    }
    function l(e, t) {
      return (
        (l =
          Object.setPrototypeOf ||
          function (e, t) {
            return ((e.__proto__ = t), e);
          }),
        l(e, t)
      );
    }
    function f(e) {
      return (
        (f = Object.setPrototypeOf
          ? Object.getPrototypeOf
          : function (e) {
              return e.__proto__ || Object.getPrototypeOf(e);
            }),
        f(e)
      );
    }
    function p(e) {
      return (
        (p =
          "function" == typeof Symbol && "symbol" == typeof Symbol.iterator
            ? function (e) {
                return typeof e;
              }
            : function (e) {
                return e &&
                  "function" == typeof Symbol &&
                  e.constructor === Symbol &&
                  e !== Symbol.prototype
                  ? "symbol"
                  : typeof e;
              }),
        p(e)
      );
    }
    var h = i("dvmmp").inspect,
      d = i("emTJb").codes.ERR_INVALID_ARG_TYPE;
    function y(e, t, r) {
      return (
        (void 0 === r || r > e.length) && (r = e.length),
        e.substring(r - t.length, r) === t
      );
    }
    var g = "",
      v = "",
      m = "",
      b = "",
      w = {
        deepStrictEqual: "Expected values to be strictly deep-equal:",
        strictEqual: "Expected values to be strictly equal:",
        strictEqualObject:
          'Expected "actual" to be reference-equal to "expected":',
        deepEqual: "Expected values to be loosely deep-equal:",
        equal: "Expected values to be loosely equal:",
        notDeepStrictEqual:
          'Expected "actual" not to be strictly deep-equal to:',
        notStrictEqual: 'Expected "actual" to be strictly unequal to:',
        notStrictEqualObject:
          'Expected "actual" not to be reference-equal to "expected":',
        notDeepEqual: 'Expected "actual" not to be loosely deep-equal to:',
        notEqual: 'Expected "actual" to be loosely unequal to:',
        notIdentical: "Values identical but not reference-equal:",
      },
      E = 10;
    function _(e) {
      var t = Object.keys(e),
        r = Object.create(Object.getPrototypeOf(e));
      return (
        t.forEach(function (t) {
          r[t] = e[t];
        }),
        Object.defineProperty(r, "message", { value: e.message }),
        r
      );
    }
    function S(e) {
      return h(e, {
        compact: !1,
        customInspect: !1,
        depth: 1e3,
        maxArrayLength: 1 / 0,
        showHidden: !1,
        breakLength: 1 / 0,
        showProxy: !1,
        sorted: !0,
        getters: !0,
      });
    }
    function A(e, t, n) {
      var o = "",
        i = "",
        a = 0,
        u = "",
        s = !1,
        c = S(e),
        l = c.split("\n"),
        f = S(t).split("\n"),
        h = 0,
        d = "";
      if (
        ("strictEqual" === n &&
          "object" === p(e) &&
          "object" === p(t) &&
          null !== e &&
          null !== t &&
          (n = "strictEqualObject"),
        1 === l.length && 1 === f.length && l[0] !== f[0])
      ) {
        var _ = l[0].length + f[0].length;
        if (_ <= E) {
          if (!(
            ("object" === p(e) && null !== e) ||
            ("object" === p(t) && null !== t) ||
            (0 === e && 0 === t)
          ))
            return (
              "".concat(w[n], "\n\n") +
              "".concat(l[0], " !== ").concat(f[0], "\n")
            );
        } else if ("strictEqualObject" !== n) {
          if (_ < (r.stderr && r.stderr.isTTY ? r.stderr.columns : 80)) {
            for (; l[0][h] === f[0][h];) h++;
            h > 2 &&
              ((d = "\n  ".concat(
                (function (e, t) {
                  if (((t = Math.floor(t)), 0 == e.length || 0 == t)) return "";
                  var r = e.length * t;
                  for (t = Math.floor(Math.log(t) / Math.log(2)); t;)
                    ((e += e), t--);
                  return e + e.substring(0, r - e.length);
                })(" ", h),
                "^",
              )),
              (h = 0));
          }
        }
      }
      for (
        var A = l[l.length - 1], O = f[f.length - 1];
        A === O &&
        (h++ < 2 ? (u = "\n  ".concat(A).concat(u)) : (o = A),
        l.pop(),
        f.pop(),
        0 !== l.length && 0 !== f.length);
      )
        ((A = l[l.length - 1]), (O = f[f.length - 1]));
      var x = Math.max(l.length, f.length);
      if (0 === x) {
        var k = c.split("\n");
        if (k.length > 30)
          for (k[26] = "".concat(g, "...").concat(b); k.length > 27;) k.pop();
        return "".concat(w.notIdentical, "\n\n").concat(k.join("\n"), "\n");
      }
      (h > 3 && ((u = "\n".concat(g, "...").concat(b).concat(u)), (s = !0)),
        "" !== o && ((u = "\n  ".concat(o).concat(u)), (o = "")));
      var j = 0,
        P =
          w[n] +
          "\n"
            .concat(v, "+ actual")
            .concat(b, " ")
            .concat(m, "- expected")
            .concat(b),
        R = " ".concat(g, "...").concat(b, " Lines skipped");
      for (h = 0; h < x; h++) {
        var T = h - a;
        if (l.length < h + 1)
          (T > 1 &&
            h > 2 &&
            (T > 4
              ? ((i += "\n".concat(g, "...").concat(b)), (s = !0))
              : T > 3 && ((i += "\n  ".concat(f[h - 2])), j++),
            (i += "\n  ".concat(f[h - 1])),
            j++),
            (a = h),
            (o += "\n".concat(m, "-").concat(b, " ").concat(f[h])),
            j++);
        else if (f.length < h + 1)
          (T > 1 &&
            h > 2 &&
            (T > 4
              ? ((i += "\n".concat(g, "...").concat(b)), (s = !0))
              : T > 3 && ((i += "\n  ".concat(l[h - 2])), j++),
            (i += "\n  ".concat(l[h - 1])),
            j++),
            (a = h),
            (i += "\n".concat(v, "+").concat(b, " ").concat(l[h])),
            j++);
        else {
          var I = f[h],
            F = l[h],
            D = F !== I && (!y(F, ",") || F.slice(0, -1) !== I);
          (D && y(I, ",") && I.slice(0, -1) === F && ((D = !1), (F += ",")),
            D
              ? (T > 1 &&
                  h > 2 &&
                  (T > 4
                    ? ((i += "\n".concat(g, "...").concat(b)), (s = !0))
                    : T > 3 && ((i += "\n  ".concat(l[h - 2])), j++),
                  (i += "\n  ".concat(l[h - 1])),
                  j++),
                (a = h),
                (i += "\n".concat(v, "+").concat(b, " ").concat(F)),
                (o += "\n".concat(m, "-").concat(b, " ").concat(I)),
                (j += 2))
              : ((i += o),
                (o = ""),
                (1 !== T && 0 !== h) || ((i += "\n  ".concat(F)), j++)));
        }
        if (j > 20 && h < x - 2)
          return (
            ""
              .concat(P)
              .concat(R, "\n")
              .concat(i, "\n")
              .concat(g, "...")
              .concat(b)
              .concat(o, "\n") + "".concat(g, "...").concat(b)
          );
      }
      return ""
        .concat(P)
        .concat(s ? R : "", "\n")
        .concat(i)
        .concat(o)
        .concat(u)
        .concat(d);
    }
    var O = (function (e) {
      function t(e) {
        var n;
        if (
          ((function (e, t) {
            if (!(e instanceof t))
              throw new TypeError("Cannot call a class as a function");
          })(this, t),
          "object" !== p(e) || null === e)
        )
          throw new d("options", "Object", e);
        var o = e.message,
          i = e.operator,
          s = e.stackStartFn,
          c = e.actual,
          l = e.expected,
          h = Error.stackTraceLimit;
        if (((Error.stackTraceLimit = 0), null != o))
          n = a(this, f(t).call(this, String(o)));
        else if (
          (r.stderr &&
            r.stderr.isTTY &&
            (r.stderr &&
            r.stderr.getColorDepth &&
            1 !== r.stderr.getColorDepth()
              ? ((g = "[34m"), (v = "[32m"), (b = "[39m"), (m = "[31m"))
              : ((g = ""), (v = ""), (b = ""), (m = ""))),
          "object" === p(c) &&
            null !== c &&
            "object" === p(l) &&
            null !== l &&
            "stack" in c &&
            c instanceof Error &&
            "stack" in l &&
            l instanceof Error &&
            ((c = _(c)), (l = _(l))),
          "deepStrictEqual" === i || "strictEqual" === i)
        )
          n = a(this, f(t).call(this, A(c, l, i)));
        else if ("notDeepStrictEqual" === i || "notStrictEqual" === i) {
          var y = w[i],
            E = S(c).split("\n");
          if (
            ("notStrictEqual" === i &&
              "object" === p(c) &&
              null !== c &&
              (y = w.notStrictEqualObject),
            E.length > 30)
          )
            for (E[26] = "".concat(g, "...").concat(b); E.length > 27;) E.pop();
          n =
            1 === E.length
              ? a(this, f(t).call(this, "".concat(y, " ").concat(E[0])))
              : a(
                  this,
                  f(t).call(
                    this,
                    "".concat(y, "\n\n").concat(E.join("\n"), "\n"),
                  ),
                );
        } else {
          var O = S(c),
            x = "",
            k = w[i];
          ("notDeepEqual" === i || "notEqual" === i
            ? (O = "".concat(w[i], "\n\n").concat(O)).length > 1024 &&
              (O = "".concat(O.slice(0, 1021), "..."))
            : ((x = "".concat(S(l))),
              O.length > 512 && (O = "".concat(O.slice(0, 509), "...")),
              x.length > 512 && (x = "".concat(x.slice(0, 509), "...")),
              "deepEqual" === i || "equal" === i
                ? (O = "".concat(k, "\n\n").concat(O, "\n\nshould equal\n\n"))
                : (x = " ".concat(i, " ").concat(x))),
            (n = a(this, f(t).call(this, "".concat(O).concat(x)))));
        }
        return (
          (Error.stackTraceLimit = h),
          (n.generatedMessage = !o),
          Object.defineProperty(u(n), "name", {
            value: "AssertionError [ERR_ASSERTION]",
            enumerable: !1,
            writable: !0,
            configurable: !0,
          }),
          (n.code = "ERR_ASSERTION"),
          (n.actual = c),
          (n.expected = l),
          (n.operator = i),
          Error.captureStackTrace && Error.captureStackTrace(u(n), s),
          n.stack,
          (n.name = "AssertionError"),
          a(n)
        );
      }
      var i, s, c;
      return (
        (function (e, t) {
          if ("function" != typeof t && null !== t)
            throw new TypeError(
              "Super expression must either be null or a function",
            );
          ((e.prototype = Object.create(t && t.prototype, {
            constructor: { value: e, writable: !0, configurable: !0 },
          })),
            t && l(e, t));
        })(t, e),
        (i = t),
        (s = [
          {
            key: "toString",
            value: function () {
              return ""
                .concat(this.name, " [")
                .concat(this.code, "]: ")
                .concat(this.message);
            },
          },
          {
            key: h.custom,
            value: function (e, t) {
              return h(
                this,
                (function (e) {
                  for (var t = 1; t < arguments.length; t++) {
                    var r = null != arguments[t] ? arguments[t] : {},
                      o = Object.keys(r);
                    ("function" == typeof Object.getOwnPropertySymbols &&
                      (o = o.concat(
                        Object.getOwnPropertySymbols(r).filter(function (e) {
                          return Object.getOwnPropertyDescriptor(r, e)
                            .enumerable;
                        }),
                      )),
                      o.forEach(function (t) {
                        n(e, t, r[t]);
                      }));
                  }
                  return e;
                })({}, t, { customInspect: !1, depth: 0 }),
              );
            },
          },
        ]),
        s && o(i.prototype, s),
        c && o(i, c),
        t
      );
    })(s(Error));
    e.exports = O;
  }),
  i.register("kcfVP", function (e, t) {
    function r(e, t) {
      if (null == e)
        throw new TypeError("Cannot convert first argument to object");
      for (var r = Object(e), n = 1; n < arguments.length; n++) {
        var o = arguments[n];
        if (null != o)
          for (
            var i = Object.keys(Object(o)), a = 0, u = i.length;
            a < u;
            a++
          ) {
            var s = i[a],
              c = Object.getOwnPropertyDescriptor(o, s);
            void 0 !== c && c.enumerable && (r[s] = o[s]);
          }
      }
      return r;
    }
    e.exports = {
      assign: r,
      polyfill: function () {
        Object.assign ||
          Object.defineProperty(Object, "assign", {
            enumerable: !1,
            configurable: !0,
            writable: !0,
            value: r,
          });
      },
    };
  }),
  i.register("ywNA6", function (e, t) {
    var r = i("TPLRI"),
      n = i("aRt5r"),
      o = i("av2td"),
      a = i("5XTyG"),
      u = i("ltX6a"),
      s = n(a(), Object);
    (r(s, { getPolyfill: a, implementation: o, shim: u }), (e.exports = s));
  }),
  i.register("TPLRI", function (e, t) {
    var r = i("9SqO7"),
      n = "function" == typeof Symbol && "symbol" == typeof Symbol("foo"),
      o = Object.prototype.toString,
      a = Array.prototype.concat,
      u = Object.defineProperty,
      s =
        u &&
        (function () {
          var e = {};
          try {
            for (var t in (u(e, "x", { enumerable: !1, value: e }), e))
              return !1;
            return e.x === e;
          } catch (e) {
            return !1;
          }
        })(),
      c = function (e, t, r, n) {
        var i;
        (!(t in e) ||
          ("function" == typeof (i = n) &&
            "[object Function]" === o.call(i) &&
            n())) &&
          (s
            ? u(e, t, {
                configurable: !0,
                enumerable: !1,
                value: r,
                writable: !0,
              })
            : (e[t] = r));
      },
      l = function (e, t) {
        var o = arguments.length > 2 ? arguments[2] : {},
          i = r(t);
        n && (i = a.call(i, Object.getOwnPropertySymbols(t)));
        for (var u = 0; u < i.length; u += 1) c(e, i[u], t[i[u]], o[i[u]]);
      };
    ((l.supportsDescriptors = !!s), (e.exports = l));
  }),
  i.register("9SqO7", function (e, t) {
    var r = Array.prototype.slice,
      n = i("6Nd5d"),
      o = Object.keys,
      a = o
        ? function (e) {
            return o(e);
          }
        : i("bhra1"),
      u = Object.keys;
    ((a.shim = function () {
      if (Object.keys) {
        var e = (function () {
          var e = Object.keys(arguments);
          return e && e.length === arguments.length;
        })(1, 2);
        e ||
          (Object.keys = function (e) {
            return n(e) ? u(r.call(e)) : u(e);
          });
      } else Object.keys = a;
      return Object.keys || a;
    }),
      (e.exports = a));
  }),
  i.register("6Nd5d", function (e, t) {
    var r = Object.prototype.toString;
    e.exports = function (e) {
      var t = r.call(e),
        n = "[object Arguments]" === t;
      return (
        n ||
          (n =
            "[object Array]" !== t &&
            null !== e &&
            "object" == typeof e &&
            "number" == typeof e.length &&
            e.length >= 0 &&
            "[object Function]" === r.call(e.callee)),
        n
      );
    };
  }),
  i.register("bhra1", function (e, t) {
    var r;
    if (!Object.keys) {
      var n = Object.prototype.hasOwnProperty,
        o = Object.prototype.toString,
        a = i("6Nd5d"),
        u = Object.prototype.propertyIsEnumerable,
        s = !u.call({ toString: null }, "toString"),
        c = u.call(function () {}, "prototype"),
        l = [
          "toString",
          "toLocaleString",
          "valueOf",
          "hasOwnProperty",
          "isPrototypeOf",
          "propertyIsEnumerable",
          "constructor",
        ],
        f = function (e) {
          var t = e.constructor;
          return t && t.prototype === e;
        },
        p = {
          $applicationCache: !0,
          $console: !0,
          $external: !0,
          $frame: !0,
          $frameElement: !0,
          $frames: !0,
          $innerHeight: !0,
          $innerWidth: !0,
          $onmozfullscreenchange: !0,
          $onmozfullscreenerror: !0,
          $outerHeight: !0,
          $outerWidth: !0,
          $pageXOffset: !0,
          $pageYOffset: !0,
          $parent: !0,
          $scrollLeft: !0,
          $scrollTop: !0,
          $scrollX: !0,
          $scrollY: !0,
          $self: !0,
          $webkitIndexedDB: !0,
          $webkitStorageInfo: !0,
          $window: !0,
        },
        h = (function () {
          if ("undefined" == typeof window) return !1;
          for (var e in window)
            try {
              if (
                !p["$" + e] &&
                n.call(window, e) &&
                null !== window[e] &&
                "object" == typeof window[e]
              )
                try {
                  f(window[e]);
                } catch (e) {
                  return !0;
                }
            } catch (e) {
              return !0;
            }
          return !1;
        })();
      r = function (e) {
        var t = null !== e && "object" == typeof e,
          r = "[object Function]" === o.call(e),
          i = a(e),
          u = t && "[object String]" === o.call(e),
          p = [];
        if (!t && !r && !i)
          throw new TypeError("Object.keys called on a non-object");
        var d = c && r;
        if (u && e.length > 0 && !n.call(e, 0))
          for (var y = 0; y < e.length; ++y) p.push(String(y));
        if (i && e.length > 0)
          for (var g = 0; g < e.length; ++g) p.push(String(g));
        else
          for (var v in e)
            (d && "prototype" === v) || !n.call(e, v) || p.push(String(v));
        if (s)
          for (
            var m = (function (e) {
                if ("undefined" == typeof window || !h) return f(e);
                try {
                  return f(e);
                } catch (e) {
                  return !1;
                }
              })(e),
              b = 0;
            b < l.length;
            ++b
          )
            (m && "constructor" === l[b]) || !n.call(e, l[b]) || p.push(l[b]);
        return p;
      };
    }
    e.exports = r;
  }),
  i.register("av2td", function (e, t) {
    var r = function (e) {
      return e != e;
    };
    e.exports = function (e, t) {
      return 0 === e && 0 === t ? 1 / e == 1 / t : e === t || !(!r(e) || !r(t));
    };
  }),
  i.register("5XTyG", function (e, t) {
    var r = i("av2td");
    e.exports = function () {
      return "function" == typeof Object.is ? Object.is : r;
    };
  }),
  i.register("ltX6a", function (e, t) {
    var r = i("5XTyG"),
      n = i("TPLRI");
    e.exports = function () {
      var e = r();
      return (
        n(
          Object,
          { is: e },
          {
            is: function () {
              return Object.is !== e;
            },
          },
        ),
        e
      );
    };
  }),
  i.register("jKPza", function (e, t) {
    function r(e, t) {
      return (
        (function (e) {
          if (Array.isArray(e)) return e;
        })(e) ||
        (function (e, t) {
          var r = [],
            n = !0,
            o = !1,
            i = void 0;
          try {
            for (
              var a, u = e[Symbol.iterator]();
              !(n = (a = u.next()).done) &&
              (r.push(a.value), !t || r.length !== t);
              n = !0
            );
          } catch (e) {
            ((o = !0), (i = e));
          } finally {
            try {
              n || null == u.return || u.return();
            } finally {
              if (o) throw i;
            }
          }
          return r;
        })(e, t) ||
        (function () {
          throw new TypeError(
            "Invalid attempt to destructure non-iterable instance",
          );
        })()
      );
    }
    function n(e) {
      return (
        (n =
          "function" == typeof Symbol && "symbol" == typeof Symbol.iterator
            ? function (e) {
                return typeof e;
              }
            : function (e) {
                return e &&
                  "function" == typeof Symbol &&
                  e.constructor === Symbol &&
                  e !== Symbol.prototype
                  ? "symbol"
                  : typeof e;
              }),
        n(e)
      );
    }
    var o = void 0 !== /a/g.flags,
      a = function (e) {
        var t = [];
        return (
          e.forEach(function (e) {
            return t.push(e);
          }),
          t
        );
      },
      u = function (e) {
        var t = [];
        return (
          e.forEach(function (e, r) {
            return t.push([r, e]);
          }),
          t
        );
      },
      s = Object.is ? Object.is : i("ywNA6"),
      c = Object.getOwnPropertySymbols
        ? Object.getOwnPropertySymbols
        : function () {
            return [];
          },
      l = Number.isNaN ? Number.isNaN : i("3MzvB");
    function f(e) {
      return e.call.bind(e);
    }
    var p = f(Object.prototype.hasOwnProperty),
      h = f(Object.prototype.propertyIsEnumerable),
      d = f(Object.prototype.toString),
      y = i("dvmmp").types,
      g = y.isAnyArrayBuffer,
      v = y.isArrayBufferView,
      m = y.isDate,
      b = y.isMap,
      w = y.isRegExp,
      E = y.isSet,
      _ = y.isNativeError,
      S = y.isBoxedPrimitive,
      A = y.isNumberObject,
      O = y.isStringObject,
      x = y.isBooleanObject,
      k = y.isBigIntObject,
      j = y.isSymbolObject,
      P = y.isFloat32Array,
      R = y.isFloat64Array;
    function T(e) {
      if (0 === e.length || e.length > 10) return !0;
      for (var t = 0; t < e.length; t++) {
        var r = e.charCodeAt(t);
        if (r < 48 || r > 57) return !0;
      }
      return 10 === e.length && e >= Math.pow(2, 32);
    }
    function I(e) {
      return Object.keys(e)
        .filter(T)
        .concat(c(e).filter(Object.prototype.propertyIsEnumerable.bind(e)));
    }
    /*!
     * The buffer module from node.js, for the browser.
     *
     * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
     * @license  MIT
     */ function F(e, t) {
      if (e === t) return 0;
      for (
        var r = e.length, n = t.length, o = 0, i = Math.min(r, n);
        o < i;
        ++o
      )
        if (e[o] !== t[o]) {
          ((r = e[o]), (n = t[o]));
          break;
        }
      return r < n ? -1 : n < r ? 1 : 0;
    }
    var D = !0,
      C = !1,
      B = 0,
      N = 1,
      L = 2,
      M = 3;
    function U(e, t, r, i) {
      if (e === t) return 0 !== e || !r || s(e, t);
      if (r) {
        if ("object" !== n(e)) return "number" == typeof e && l(e) && l(t);
        if ("object" !== n(t) || null === e || null === t) return !1;
        if (Object.getPrototypeOf(e) !== Object.getPrototypeOf(t)) return !1;
      } else {
        if (null === e || "object" !== n(e))
          return (null === t || "object" !== n(t)) && e == t;
        if (null === t || "object" !== n(t)) return !1;
      }
      var a,
        u,
        c,
        f,
        p = d(e);
      if (p !== d(t)) return !1;
      if (Array.isArray(e)) {
        if (e.length !== t.length) return !1;
        var h = I(e),
          y = I(t);
        return h.length === y.length && K(e, t, r, i, N, h);
      }
      if ("[object Object]" === p && ((!b(e) && b(t)) || (!E(e) && E(t))))
        return !1;
      if (m(e)) {
        if (
          !m(t) ||
          Date.prototype.getTime.call(e) !== Date.prototype.getTime.call(t)
        )
          return !1;
      } else if (w(e)) {
        if (
          !w(t) ||
          ((c = e),
          (f = t),
          !(o
            ? c.source === f.source && c.flags === f.flags
            : RegExp.prototype.toString.call(c) ===
              RegExp.prototype.toString.call(f)))
        )
          return !1;
      } else if (_(e) || e instanceof Error) {
        if (e.message !== t.message || e.name !== t.name) return !1;
      } else {
        if (v(e)) {
          if (r || (!P(e) && !R(e))) {
            if (
              !(function (e, t) {
                return (
                  e.byteLength === t.byteLength &&
                  0 ===
                    F(
                      new Uint8Array(e.buffer, e.byteOffset, e.byteLength),
                      new Uint8Array(t.buffer, t.byteOffset, t.byteLength),
                    )
                );
              })(e, t)
            )
              return !1;
          } else if (
            !(function (e, t) {
              if (e.byteLength !== t.byteLength) return !1;
              for (var r = 0; r < e.byteLength; r++)
                if (e[r] !== t[r]) return !1;
              return !0;
            })(e, t)
          )
            return !1;
          var T = I(e),
            D = I(t);
          return T.length === D.length && K(e, t, r, i, B, T);
        }
        if (E(e)) return !(!E(t) || e.size !== t.size) && K(e, t, r, i, L);
        if (b(e)) return !(!b(t) || e.size !== t.size) && K(e, t, r, i, M);
        if (g(e)) {
          if (
            ((u = t),
            (a = e).byteLength !== u.byteLength ||
              0 !== F(new Uint8Array(a), new Uint8Array(u)))
          )
            return !1;
        } else if (
          S(e) &&
          !(function (e, t) {
            return A(e)
              ? A(t) &&
                  s(
                    Number.prototype.valueOf.call(e),
                    Number.prototype.valueOf.call(t),
                  )
              : O(e)
                ? O(t) &&
                  String.prototype.valueOf.call(e) ===
                    String.prototype.valueOf.call(t)
                : x(e)
                  ? x(t) &&
                    Boolean.prototype.valueOf.call(e) ===
                      Boolean.prototype.valueOf.call(t)
                  : k(e)
                    ? k(t) &&
                      BigInt.prototype.valueOf.call(e) ===
                        BigInt.prototype.valueOf.call(t)
                    : j(t) &&
                      Symbol.prototype.valueOf.call(e) ===
                        Symbol.prototype.valueOf.call(t);
          })(e, t)
        )
          return !1;
      }
      return K(e, t, r, i, B);
    }
    function q(e, t) {
      return t.filter(function (t) {
        return h(e, t);
      });
    }
    function K(e, t, o, i, s, l) {
      if (5 === arguments.length) {
        l = Object.keys(e);
        var f = Object.keys(t);
        if (l.length !== f.length) return !1;
      }
      for (var d = 0; d < l.length; d++) if (!p(t, l[d])) return !1;
      if (o && 5 === arguments.length) {
        var y = c(e);
        if (0 !== y.length) {
          var g = 0;
          for (d = 0; d < y.length; d++) {
            var v = y[d];
            if (h(e, v)) {
              if (!h(t, v)) return !1;
              (l.push(v), g++);
            } else if (h(t, v)) return !1;
          }
          var m = c(t);
          if (y.length !== m.length && q(t, m).length !== g) return !1;
        } else {
          var b = c(t);
          if (0 !== b.length && 0 !== q(t, b).length) return !1;
        }
      }
      if (
        0 === l.length &&
        (s === B || (s === N && 0 === e.length) || 0 === e.size)
      )
        return !0;
      if (void 0 === i) i = { val1: new Map(), val2: new Map(), position: 0 };
      else {
        var w = i.val1.get(e);
        if (void 0 !== w) {
          var E = i.val2.get(t);
          if (void 0 !== E) return w === E;
        }
        i.position++;
      }
      (i.val1.set(e, i.position), i.val2.set(t, i.position));
      var _ = (function (e, t, o, i, s, c) {
        var l = 0;
        if (c === L) {
          if (
            !(function (e, t, r, o) {
              for (var i = null, u = a(e), s = 0; s < u.length; s++) {
                var c = u[s];
                if ("object" === n(c) && null !== c)
                  (null === i && (i = new Set()), i.add(c));
                else if (!t.has(c)) {
                  if (r) return !1;
                  if (!G(e, t, c)) return !1;
                  (null === i && (i = new Set()), i.add(c));
                }
              }
              if (null !== i) {
                for (var l = a(t), f = 0; f < l.length; f++) {
                  var p = l[f];
                  if ("object" === n(p) && null !== p) {
                    if (!W(i, p, r, o)) return !1;
                  } else if (!r && !e.has(p) && !W(i, p, r, o)) return !1;
                }
                return 0 === i.size;
              }
              return !0;
            })(e, t, o, s)
          )
            return !1;
        } else if (c === M) {
          if (
            !(function (e, t, o, i) {
              for (var a = null, s = u(e), c = 0; c < s.length; c++) {
                var l = r(s[c], 2),
                  f = l[0],
                  p = l[1];
                if ("object" === n(f) && null !== f)
                  (null === a && (a = new Set()), a.add(f));
                else {
                  var h = t.get(f);
                  if ((void 0 === h && !t.has(f)) || !U(p, h, o, i)) {
                    if (o) return !1;
                    if (!z(e, t, f, p, i)) return !1;
                    (null === a && (a = new Set()), a.add(f));
                  }
                }
              }
              if (null !== a) {
                for (var d = u(t), y = 0; y < d.length; y++) {
                  var g = r(d[y], 2),
                    v = ((f = g[0]), g[1]);
                  if ("object" === n(f) && null !== f) {
                    if (!V(a, e, f, v, o, i)) return !1;
                  } else if (!(
                    o ||
                    (e.has(f) && U(e.get(f), v, !1, i)) ||
                    V(a, e, f, v, !1, i)
                  ))
                    return !1;
                }
                return 0 === a.size;
              }
              return !0;
            })(e, t, o, s)
          )
            return !1;
        } else if (c === N)
          for (; l < e.length; l++) {
            if (!p(e, l)) {
              if (p(t, l)) return !1;
              for (var f = Object.keys(e); l < f.length; l++) {
                var h = f[l];
                if (!p(t, h) || !U(e[h], t[h], o, s)) return !1;
              }
              return f.length === Object.keys(t).length;
            }
            if (!p(t, l) || !U(e[l], t[l], o, s)) return !1;
          }
        for (l = 0; l < i.length; l++) {
          var d = i[l];
          if (!U(e[d], t[d], o, s)) return !1;
        }
        return !0;
      })(e, t, o, l, i, s);
      return (i.val1.delete(e), i.val2.delete(t), _);
    }
    function W(e, t, r, n) {
      for (var o = a(e), i = 0; i < o.length; i++) {
        var u = o[i];
        if (U(t, u, r, n)) return (e.delete(u), !0);
      }
      return !1;
    }
    function $(e) {
      switch (n(e)) {
        case "undefined":
          return null;
        case "object":
          return;
        case "symbol":
          return !1;
        case "string":
          e = +e;
        case "number":
          if (l(e)) return !1;
      }
      return !0;
    }
    function G(e, t, r) {
      var n = $(r);
      return null != n ? n : t.has(n) && !e.has(n);
    }
    function z(e, t, r, n, o) {
      var i = $(r);
      if (null != i) return i;
      var a = t.get(i);
      return (
        !((void 0 === a && !t.has(i)) || !U(n, a, !1, o)) &&
        !e.has(i) &&
        U(n, a, !1, o)
      );
    }
    function V(e, t, r, n, o, i) {
      for (var u = a(e), s = 0; s < u.length; s++) {
        var c = u[s];
        if (U(r, c, o, i) && U(n, t.get(c), o, i)) return (e.delete(c), !0);
      }
      return !1;
    }
    e.exports = {
      isDeepEqual: function (e, t) {
        return U(e, t, C);
      },
      isDeepStrictEqual: function (e, t) {
        return U(e, t, D);
      },
    };
  }),
  i.register("3MzvB", function (e, t) {
    var r = i("aRt5r"),
      n = i("TPLRI"),
      o = i("UFzyE"),
      a = i("3WIY1"),
      u = i("7WaY0"),
      s = r(a(), Number);
    (n(s, { getPolyfill: a, implementation: o, shim: u }), (e.exports = s));
  }),
  i.register("UFzyE", function (e, t) {
    e.exports = function (e) {
      return e != e;
    };
  }),
  i.register("3WIY1", function (e, t) {
    var r = i("UFzyE");
    e.exports = function () {
      return Number.isNaN && Number.isNaN(NaN) && !Number.isNaN("a")
        ? Number.isNaN
        : r;
    };
  }),
  i.register("7WaY0", function (e, t) {
    var r = i("TPLRI"),
      n = i("3WIY1");
    e.exports = function () {
      var e = n();
      return (
        r(
          Number,
          { isNaN: e },
          {
            isNaN: function () {
              return Number.isNaN !== e;
            },
          },
        ),
        e
      );
    };
  }),
  i.register("hj8BX", function (e, t) {
    e.exports = n;
    var r = i("142Mh").EventEmitter;
    function n() {
      r.call(this);
    }
    (i("2jKWR")(n, r),
      (n.Readable = i("97FLL")),
      (n.Writable = i("aeAI7")),
      (n.Duplex = i("ilj3k")),
      (n.Transform = i("1fXar")),
      (n.PassThrough = i("8aveM")),
      (n.finished = i("dG6Tn")),
      (n.pipeline = i("8H9ZT")),
      (n.Stream = n),
      (n.prototype.pipe = function (e, t) {
        var n = this;
        function o(t) {
          e.writable && !1 === e.write(t) && n.pause && n.pause();
        }
        function i() {
          n.readable && n.resume && n.resume();
        }
        (n.on("data", o),
          e.on("drain", i),
          e._isStdio ||
            (t && !1 === t.end) ||
            (n.on("end", u), n.on("close", s)));
        var a = !1;
        function u() {
          a || ((a = !0), e.end());
        }
        function s() {
          a || ((a = !0), "function" == typeof e.destroy && e.destroy());
        }
        function c(e) {
          if ((l(), 0 === r.listenerCount(this, "error"))) throw e;
        }
        function l() {
          (n.removeListener("data", o),
            e.removeListener("drain", i),
            n.removeListener("end", u),
            n.removeListener("close", s),
            n.removeListener("error", c),
            e.removeListener("error", c),
            n.removeListener("end", l),
            n.removeListener("close", l),
            e.removeListener("close", l));
        }
        return (
          n.on("error", c),
          e.on("error", c),
          n.on("end", l),
          n.on("close", l),
          e.on("close", l),
          e.emit("pipe", n),
          e
        );
      }));
  }),
  i.register("142Mh", function (e, t) {
    var r,
      n = "object" == typeof Reflect ? Reflect : null,
      o =
        n && "function" == typeof n.apply
          ? n.apply
          : function (e, t, r) {
              return Function.prototype.apply.call(e, t, r);
            };
    r =
      n && "function" == typeof n.ownKeys
        ? n.ownKeys
        : Object.getOwnPropertySymbols
          ? function (e) {
              return Object.getOwnPropertyNames(e).concat(
                Object.getOwnPropertySymbols(e),
              );
            }
          : function (e) {
              return Object.getOwnPropertyNames(e);
            };
    var i =
      Number.isNaN ||
      function (e) {
        return e != e;
      };
    function a() {
      a.init.call(this);
    }
    ((e.exports = a),
      (e.exports.once = function (e, t) {
        return new Promise(function (r, n) {
          function o(r) {
            (e.removeListener(t, i), n(r));
          }
          function i() {
            ("function" == typeof e.removeListener &&
              e.removeListener("error", o),
              r([].slice.call(arguments)));
          }
          (g(e, t, i, { once: !0 }),
            "error" !== t &&
              (function (e, t, r) {
                "function" == typeof e.on && g(e, "error", t, r);
              })(e, o, { once: !0 }));
        });
      }),
      (a.EventEmitter = a),
      (a.prototype._events = void 0),
      (a.prototype._eventsCount = 0),
      (a.prototype._maxListeners = void 0));
    var u = 10;
    function s(e) {
      if ("function" != typeof e)
        throw new TypeError(
          'The "listener" argument must be of type Function. Received type ' +
            typeof e,
        );
    }
    function c(e) {
      return void 0 === e._maxListeners
        ? a.defaultMaxListeners
        : e._maxListeners;
    }
    function l(e, t, r, n) {
      var o, i, a, u;
      if (
        (s(r),
        void 0 === (i = e._events)
          ? ((i = e._events = Object.create(null)), (e._eventsCount = 0))
          : (void 0 !== i.newListener &&
              (e.emit("newListener", t, r.listener ? r.listener : r),
              (i = e._events)),
            (a = i[t])),
        void 0 === a)
      )
        ((a = i[t] = r), ++e._eventsCount);
      else if (
        ("function" == typeof a
          ? (a = i[t] = n ? [r, a] : [a, r])
          : n
            ? a.unshift(r)
            : a.push(r),
        (o = c(e)) > 0 && a.length > o && !a.warned)
      ) {
        a.warned = !0;
        var l = new Error(
          "Possible EventEmitter memory leak detected. " +
            a.length +
            " " +
            String(t) +
            " listeners added. Use emitter.setMaxListeners() to increase limit",
        );
        ((l.name = "MaxListenersExceededWarning"),
          (l.emitter = e),
          (l.type = t),
          (l.count = a.length),
          (u = l),
          console && console.warn && console.warn(u));
      }
      return e;
    }
    function f() {
      if (!this.fired)
        return (
          this.target.removeListener(this.type, this.wrapFn),
          (this.fired = !0),
          0 === arguments.length
            ? this.listener.call(this.target)
            : this.listener.apply(this.target, arguments)
        );
    }
    function p(e, t, r) {
      var n = { fired: !1, wrapFn: void 0, target: e, type: t, listener: r },
        o = f.bind(n);
      return ((o.listener = r), (n.wrapFn = o), o);
    }
    function h(e, t, r) {
      var n = e._events;
      if (void 0 === n) return [];
      var o = n[t];
      return void 0 === o
        ? []
        : "function" == typeof o
          ? r
            ? [o.listener || o]
            : [o]
          : r
            ? (function (e) {
                for (var t = new Array(e.length), r = 0; r < t.length; ++r)
                  t[r] = e[r].listener || e[r];
                return t;
              })(o)
            : y(o, o.length);
    }
    function d(e) {
      var t = this._events;
      if (void 0 !== t) {
        var r = t[e];
        if ("function" == typeof r) return 1;
        if (void 0 !== r) return r.length;
      }
      return 0;
    }
    function y(e, t) {
      for (var r = new Array(t), n = 0; n < t; ++n) r[n] = e[n];
      return r;
    }
    function g(e, t, r, n) {
      if ("function" == typeof e.on) n.once ? e.once(t, r) : e.on(t, r);
      else {
        if ("function" != typeof e.addEventListener)
          throw new TypeError(
            'The "emitter" argument must be of type EventEmitter. Received type ' +
              typeof e,
          );
        e.addEventListener(t, function o(i) {
          (n.once && e.removeEventListener(t, o), r(i));
        });
      }
    }
    (Object.defineProperty(a, "defaultMaxListeners", {
      enumerable: !0,
      get: function () {
        return u;
      },
      set: function (e) {
        if ("number" != typeof e || e < 0 || i(e))
          throw new RangeError(
            'The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' +
              e +
              ".",
          );
        u = e;
      },
    }),
      (a.init = function () {
        ((void 0 !== this._events &&
          this._events !== Object.getPrototypeOf(this)._events) ||
          ((this._events = Object.create(null)), (this._eventsCount = 0)),
          (this._maxListeners = this._maxListeners || void 0));
      }),
      (a.prototype.setMaxListeners = function (e) {
        if ("number" != typeof e || e < 0 || i(e))
          throw new RangeError(
            'The value of "n" is out of range. It must be a non-negative number. Received ' +
              e +
              ".",
          );
        return ((this._maxListeners = e), this);
      }),
      (a.prototype.getMaxListeners = function () {
        return c(this);
      }),
      (a.prototype.emit = function (e) {
        for (var t = [], r = 1; r < arguments.length; r++) t.push(arguments[r]);
        var n = "error" === e,
          i = this._events;
        if (void 0 !== i) n = n && void 0 === i.error;
        else if (!n) return !1;
        if (n) {
          var a;
          if ((t.length > 0 && (a = t[0]), a instanceof Error)) throw a;
          var u = new Error(
            "Unhandled error." + (a ? " (" + a.message + ")" : ""),
          );
          throw ((u.context = a), u);
        }
        var s = i[e];
        if (void 0 === s) return !1;
        if ("function" == typeof s) o(s, this, t);
        else {
          var c = s.length,
            l = y(s, c);
          for (r = 0; r < c; ++r) o(l[r], this, t);
        }
        return !0;
      }),
      (a.prototype.addListener = function (e, t) {
        return l(this, e, t, !1);
      }),
      (a.prototype.on = a.prototype.addListener),
      (a.prototype.prependListener = function (e, t) {
        return l(this, e, t, !0);
      }),
      (a.prototype.once = function (e, t) {
        return (s(t), this.on(e, p(this, e, t)), this);
      }),
      (a.prototype.prependOnceListener = function (e, t) {
        return (s(t), this.prependListener(e, p(this, e, t)), this);
      }),
      (a.prototype.removeListener = function (e, t) {
        var r, n, o, i, a;
        if ((s(t), void 0 === (n = this._events))) return this;
        if (void 0 === (r = n[e])) return this;
        if (r === t || r.listener === t)
          0 == --this._eventsCount
            ? (this._events = Object.create(null))
            : (delete n[e],
              n.removeListener &&
                this.emit("removeListener", e, r.listener || t));
        else if ("function" != typeof r) {
          for (o = -1, i = r.length - 1; i >= 0; i--)
            if (r[i] === t || r[i].listener === t) {
              ((a = r[i].listener), (o = i));
              break;
            }
          if (o < 0) return this;
          (0 === o
            ? r.shift()
            : (function (e, t) {
                for (; t + 1 < e.length; t++) e[t] = e[t + 1];
                e.pop();
              })(r, o),
            1 === r.length && (n[e] = r[0]),
            void 0 !== n.removeListener &&
              this.emit("removeListener", e, a || t));
        }
        return this;
      }),
      (a.prototype.off = a.prototype.removeListener),
      (a.prototype.removeAllListeners = function (e) {
        var t, r, n;
        if (void 0 === (r = this._events)) return this;
        if (void 0 === r.removeListener)
          return (
            0 === arguments.length
              ? ((this._events = Object.create(null)), (this._eventsCount = 0))
              : void 0 !== r[e] &&
                (0 == --this._eventsCount
                  ? (this._events = Object.create(null))
                  : delete r[e]),
            this
          );
        if (0 === arguments.length) {
          var o,
            i = Object.keys(r);
          for (n = 0; n < i.length; ++n)
            "removeListener" !== (o = i[n]) && this.removeAllListeners(o);
          return (
            this.removeAllListeners("removeListener"),
            (this._events = Object.create(null)),
            (this._eventsCount = 0),
            this
          );
        }
        if ("function" == typeof (t = r[e])) this.removeListener(e, t);
        else if (void 0 !== t)
          for (n = t.length - 1; n >= 0; n--) this.removeListener(e, t[n]);
        return this;
      }),
      (a.prototype.listeners = function (e) {
        return h(this, e, !0);
      }),
      (a.prototype.rawListeners = function (e) {
        return h(this, e, !1);
      }),
      (a.listenerCount = function (e, t) {
        return "function" == typeof e.listenerCount
          ? e.listenerCount(t)
          : d.call(e, t);
      }),
      (a.prototype.listenerCount = d),
      (a.prototype.eventNames = function () {
        return this._eventsCount > 0 ? r(this._events) : [];
      }));
  }),
  i.register("97FLL", function (e, t) {
    var n,
      o = i("kIky1");
    ((e.exports = x), (x.ReadableState = O));
    i("142Mh").EventEmitter;
    var a = function (e, t) {
        return e.listeners(t).length;
      },
      u = i("duDpq"),
      s = i("69fUi").Buffer,
      c =
        (void 0 !== r
          ? r
          : "undefined" != typeof window
            ? window
            : "undefined" != typeof self
              ? self
              : {}
        ).Uint8Array || function () {};
    var l,
      f = i("faMnJ");
    l = f && f.debuglog ? f.debuglog("stream") : function () {};
    var p,
      h,
      d,
      y = i("fW2vO"),
      g = i("eSPuu"),
      v = i("6r8gG").getHighWaterMark,
      m = i("2H4BZ").codes,
      b = m.ERR_INVALID_ARG_TYPE,
      w = m.ERR_STREAM_PUSH_AFTER_EOF,
      E = m.ERR_METHOD_NOT_IMPLEMENTED,
      _ = m.ERR_STREAM_UNSHIFT_AFTER_END_EVENT;
    i("2jKWR")(x, u);
    var S = g.errorOrDestroy,
      A = ["error", "close", "destroy", "pause", "resume"];
    function O(e, t, r) {
      ((n = n || i("ilj3k")),
        (e = e || {}),
        "boolean" != typeof r && (r = t instanceof n),
        (this.objectMode = !!e.objectMode),
        r && (this.objectMode = this.objectMode || !!e.readableObjectMode),
        (this.highWaterMark = v(this, e, "readableHighWaterMark", r)),
        (this.buffer = new y()),
        (this.length = 0),
        (this.pipes = null),
        (this.pipesCount = 0),
        (this.flowing = null),
        (this.ended = !1),
        (this.endEmitted = !1),
        (this.reading = !1),
        (this.sync = !0),
        (this.needReadable = !1),
        (this.emittedReadable = !1),
        (this.readableListening = !1),
        (this.resumeScheduled = !1),
        (this.paused = !0),
        (this.emitClose = !1 !== e.emitClose),
        (this.autoDestroy = !!e.autoDestroy),
        (this.destroyed = !1),
        (this.defaultEncoding = e.defaultEncoding || "utf8"),
        (this.awaitDrain = 0),
        (this.readingMore = !1),
        (this.decoder = null),
        (this.encoding = null),
        e.encoding &&
          (p || (p = i("lTqX2").StringDecoder),
          (this.decoder = new p(e.encoding)),
          (this.encoding = e.encoding)));
    }
    function x(e) {
      if (((n = n || i("ilj3k")), !(this instanceof x))) return new x(e);
      var t = this instanceof n;
      ((this._readableState = new O(e, this, t)),
        (this.readable = !0),
        e &&
          ("function" == typeof e.read && (this._read = e.read),
          "function" == typeof e.destroy && (this._destroy = e.destroy)),
        u.call(this));
    }
    function k(e, t, r, n, o) {
      l("readableAddChunk", t);
      var i,
        a = e._readableState;
      if (null === t)
        ((a.reading = !1),
          (function (e, t) {
            if ((l("onEofChunk"), t.ended)) return;
            if (t.decoder) {
              var r = t.decoder.end();
              r &&
                r.length &&
                (t.buffer.push(r), (t.length += t.objectMode ? 1 : r.length));
            }
            ((t.ended = !0),
              t.sync
                ? T(e)
                : ((t.needReadable = !1),
                  t.emittedReadable || ((t.emittedReadable = !0), I(e))));
          })(e, a));
      else if (
        (o ||
          (i = (function (e, t) {
            var r;
            ((n = t),
              s.isBuffer(n) ||
                n instanceof c ||
                "string" == typeof t ||
                void 0 === t ||
                e.objectMode ||
                (r = new b("chunk", ["string", "Buffer", "Uint8Array"], t)));
            var n;
            return r;
          })(a, t)),
        i)
      )
        S(e, i);
      else if (a.objectMode || (t && t.length > 0))
        if (
          ("string" == typeof t ||
            a.objectMode ||
            Object.getPrototypeOf(t) === s.prototype ||
            (t = (function (e) {
              return s.from(e);
            })(t)),
          n)
        )
          a.endEmitted ? S(e, new _()) : j(e, a, t, !0);
        else if (a.ended) S(e, new w());
        else {
          if (a.destroyed) return !1;
          ((a.reading = !1),
            a.decoder && !r
              ? ((t = a.decoder.write(t)),
                a.objectMode || 0 !== t.length ? j(e, a, t, !1) : F(e, a))
              : j(e, a, t, !1));
        }
      else n || ((a.reading = !1), F(e, a));
      return !a.ended && (a.length < a.highWaterMark || 0 === a.length);
    }
    function j(e, t, r, n) {
      (t.flowing && 0 === t.length && !t.sync
        ? ((t.awaitDrain = 0), e.emit("data", r))
        : ((t.length += t.objectMode ? 1 : r.length),
          n ? t.buffer.unshift(r) : t.buffer.push(r),
          t.needReadable && T(e)),
        F(e, t));
    }
    (Object.defineProperty(x.prototype, "destroyed", {
      enumerable: !1,
      get: function () {
        return void 0 !== this._readableState && this._readableState.destroyed;
      },
      set: function (e) {
        this._readableState && (this._readableState.destroyed = e);
      },
    }),
      (x.prototype.destroy = g.destroy),
      (x.prototype._undestroy = g.undestroy),
      (x.prototype._destroy = function (e, t) {
        t(e);
      }),
      (x.prototype.push = function (e, t) {
        var r,
          n = this._readableState;
        return (
          n.objectMode
            ? (r = !0)
            : "string" == typeof e &&
              ((t = t || n.defaultEncoding) !== n.encoding &&
                ((e = s.from(e, t)), (t = "")),
              (r = !0)),
          k(this, e, t, !1, r)
        );
      }),
      (x.prototype.unshift = function (e) {
        return k(this, e, null, !0, !1);
      }),
      (x.prototype.isPaused = function () {
        return !1 === this._readableState.flowing;
      }),
      (x.prototype.setEncoding = function (e) {
        p || (p = i("lTqX2").StringDecoder);
        var t = new p(e);
        ((this._readableState.decoder = t),
          (this._readableState.encoding =
            this._readableState.decoder.encoding));
        for (var r = this._readableState.buffer.head, n = ""; null !== r;)
          ((n += t.write(r.data)), (r = r.next));
        return (
          this._readableState.buffer.clear(),
          "" !== n && this._readableState.buffer.push(n),
          (this._readableState.length = n.length),
          this
        );
      }));
    var P = 1073741824;
    function R(e, t) {
      return e <= 0 || (0 === t.length && t.ended)
        ? 0
        : t.objectMode
          ? 1
          : e != e
            ? t.flowing && t.length
              ? t.buffer.head.data.length
              : t.length
            : (e > t.highWaterMark &&
                (t.highWaterMark = (function (e) {
                  return (
                    e >= P
                      ? (e = P)
                      : (e--,
                        (e |= e >>> 1),
                        (e |= e >>> 2),
                        (e |= e >>> 4),
                        (e |= e >>> 8),
                        (e |= e >>> 16),
                        e++),
                    e
                  );
                })(e)),
              e <= t.length
                ? e
                : t.ended
                  ? t.length
                  : ((t.needReadable = !0), 0));
    }
    function T(e) {
      var t = e._readableState;
      (l("emitReadable", t.needReadable, t.emittedReadable),
        (t.needReadable = !1),
        t.emittedReadable ||
          (l("emitReadable", t.flowing),
          (t.emittedReadable = !0),
          o.nextTick(I, e)));
    }
    function I(e) {
      var t = e._readableState;
      (l("emitReadable_", t.destroyed, t.length, t.ended),
        t.destroyed ||
          (!t.length && !t.ended) ||
          (e.emit("readable"), (t.emittedReadable = !1)),
        (t.needReadable =
          !t.flowing && !t.ended && t.length <= t.highWaterMark),
        L(e));
    }
    function F(e, t) {
      t.readingMore || ((t.readingMore = !0), o.nextTick(D, e, t));
    }
    function D(e, t) {
      for (
        ;
        !t.reading &&
        !t.ended &&
        (t.length < t.highWaterMark || (t.flowing && 0 === t.length));
      ) {
        var r = t.length;
        if ((l("maybeReadMore read 0"), e.read(0), r === t.length)) break;
      }
      t.readingMore = !1;
    }
    function C(e) {
      var t = e._readableState;
      ((t.readableListening = e.listenerCount("readable") > 0),
        t.resumeScheduled && !t.paused
          ? (t.flowing = !0)
          : e.listenerCount("data") > 0 && e.resume());
    }
    function B(e) {
      (l("readable nexttick read 0"), e.read(0));
    }
    function N(e, t) {
      (l("resume", t.reading),
        t.reading || e.read(0),
        (t.resumeScheduled = !1),
        e.emit("resume"),
        L(e),
        t.flowing && !t.reading && e.read(0));
    }
    function L(e) {
      var t = e._readableState;
      for (l("flow", t.flowing); t.flowing && null !== e.read(););
    }
    function M(e, t) {
      return 0 === t.length
        ? null
        : (t.objectMode
            ? (r = t.buffer.shift())
            : !e || e >= t.length
              ? ((r = t.decoder
                  ? t.buffer.join("")
                  : 1 === t.buffer.length
                    ? t.buffer.first()
                    : t.buffer.concat(t.length)),
                t.buffer.clear())
              : (r = t.buffer.consume(e, t.decoder)),
          r);
      var r;
    }
    function U(e) {
      var t = e._readableState;
      (l("endReadable", t.endEmitted),
        t.endEmitted || ((t.ended = !0), o.nextTick(q, t, e)));
    }
    function q(e, t) {
      if (
        (l("endReadableNT", e.endEmitted, e.length),
        !e.endEmitted &&
          0 === e.length &&
          ((e.endEmitted = !0),
          (t.readable = !1),
          t.emit("end"),
          e.autoDestroy))
      ) {
        var r = t._writableState;
        (!r || (r.autoDestroy && r.finished)) && t.destroy();
      }
    }
    function K(e, t) {
      for (var r = 0, n = e.length; r < n; r++) if (e[r] === t) return r;
      return -1;
    }
    ((x.prototype.read = function (e) {
      (l("read", e), (e = parseInt(e, 10)));
      var t = this._readableState,
        r = e;
      if (
        (0 !== e && (t.emittedReadable = !1),
        0 === e &&
          t.needReadable &&
          ((0 !== t.highWaterMark
            ? t.length >= t.highWaterMark
            : t.length > 0) ||
            t.ended))
      )
        return (
          l("read: emitReadable", t.length, t.ended),
          0 === t.length && t.ended ? U(this) : T(this),
          null
        );
      if (0 === (e = R(e, t)) && t.ended)
        return (0 === t.length && U(this), null);
      var n,
        o = t.needReadable;
      return (
        l("need readable", o),
        (0 === t.length || t.length - e < t.highWaterMark) &&
          l("length less than watermark", (o = !0)),
        t.ended || t.reading
          ? l("reading or ended", (o = !1))
          : o &&
            (l("do read"),
            (t.reading = !0),
            (t.sync = !0),
            0 === t.length && (t.needReadable = !0),
            this._read(t.highWaterMark),
            (t.sync = !1),
            t.reading || (e = R(r, t))),
        null === (n = e > 0 ? M(e, t) : null)
          ? ((t.needReadable = t.length <= t.highWaterMark), (e = 0))
          : ((t.length -= e), (t.awaitDrain = 0)),
        0 === t.length &&
          (t.ended || (t.needReadable = !0), r !== e && t.ended && U(this)),
        null !== n && this.emit("data", n),
        n
      );
    }),
      (x.prototype._read = function (e) {
        S(this, new E("_read()"));
      }),
      (x.prototype.pipe = function (e, t) {
        var r = this,
          n = this._readableState;
        switch (n.pipesCount) {
          case 0:
            n.pipes = e;
            break;
          case 1:
            n.pipes = [n.pipes, e];
            break;
          default:
            n.pipes.push(e);
        }
        ((n.pipesCount += 1), l("pipe count=%d opts=%j", n.pipesCount, t));
        var i =
          (!t || !1 !== t.end) && e !== o.stdout && e !== o.stderr ? s : g;
        function u(t, o) {
          (l("onunpipe"),
            t === r &&
              o &&
              !1 === o.hasUnpiped &&
              ((o.hasUnpiped = !0),
              l("cleanup"),
              e.removeListener("close", d),
              e.removeListener("finish", y),
              e.removeListener("drain", c),
              e.removeListener("error", h),
              e.removeListener("unpipe", u),
              r.removeListener("end", s),
              r.removeListener("end", g),
              r.removeListener("data", p),
              (f = !0),
              !n.awaitDrain ||
                (e._writableState && !e._writableState.needDrain) ||
                c()));
        }
        function s() {
          (l("onend"), e.end());
        }
        (n.endEmitted ? o.nextTick(i) : r.once("end", i), e.on("unpipe", u));
        var c = (function (e) {
          return function () {
            var t = e._readableState;
            (l("pipeOnDrain", t.awaitDrain),
              t.awaitDrain && t.awaitDrain--,
              0 === t.awaitDrain && a(e, "data") && ((t.flowing = !0), L(e)));
          };
        })(r);
        e.on("drain", c);
        var f = !1;
        function p(t) {
          l("ondata");
          var o = e.write(t);
          (l("dest.write", o),
            !1 === o &&
              (((1 === n.pipesCount && n.pipes === e) ||
                (n.pipesCount > 1 && -1 !== K(n.pipes, e))) &&
                !f &&
                (l("false write response, pause", n.awaitDrain),
                n.awaitDrain++),
              r.pause()));
        }
        function h(t) {
          (l("onerror", t),
            g(),
            e.removeListener("error", h),
            0 === a(e, "error") && S(e, t));
        }
        function d() {
          (e.removeListener("finish", y), g());
        }
        function y() {
          (l("onfinish"), e.removeListener("close", d), g());
        }
        function g() {
          (l("unpipe"), r.unpipe(e));
        }
        return (
          r.on("data", p),
          (function (e, t, r) {
            if ("function" == typeof e.prependListener)
              return e.prependListener(t, r);
            e._events && e._events[t]
              ? Array.isArray(e._events[t])
                ? e._events[t].unshift(r)
                : (e._events[t] = [r, e._events[t]])
              : e.on(t, r);
          })(e, "error", h),
          e.once("close", d),
          e.once("finish", y),
          e.emit("pipe", r),
          n.flowing || (l("pipe resume"), r.resume()),
          e
        );
      }),
      (x.prototype.unpipe = function (e) {
        var t = this._readableState,
          r = { hasUnpiped: !1 };
        if (0 === t.pipesCount) return this;
        if (1 === t.pipesCount)
          return (
            (e && e !== t.pipes) ||
              (e || (e = t.pipes),
              (t.pipes = null),
              (t.pipesCount = 0),
              (t.flowing = !1),
              e && e.emit("unpipe", this, r)),
            this
          );
        if (!e) {
          var n = t.pipes,
            o = t.pipesCount;
          ((t.pipes = null), (t.pipesCount = 0), (t.flowing = !1));
          for (var i = 0; i < o; i++)
            n[i].emit("unpipe", this, { hasUnpiped: !1 });
          return this;
        }
        var a = K(t.pipes, e);
        return (
          -1 === a ||
            (t.pipes.splice(a, 1),
            (t.pipesCount -= 1),
            1 === t.pipesCount && (t.pipes = t.pipes[0]),
            e.emit("unpipe", this, r)),
          this
        );
      }),
      (x.prototype.on = function (e, t) {
        var r = u.prototype.on.call(this, e, t),
          n = this._readableState;
        return (
          "data" === e
            ? ((n.readableListening = this.listenerCount("readable") > 0),
              !1 !== n.flowing && this.resume())
            : "readable" === e &&
              (n.endEmitted ||
                n.readableListening ||
                ((n.readableListening = n.needReadable = !0),
                (n.flowing = !1),
                (n.emittedReadable = !1),
                l("on readable", n.length, n.reading),
                n.length ? T(this) : n.reading || o.nextTick(B, this))),
          r
        );
      }),
      (x.prototype.addListener = x.prototype.on),
      (x.prototype.removeListener = function (e, t) {
        var r = u.prototype.removeListener.call(this, e, t);
        return ("readable" === e && o.nextTick(C, this), r);
      }),
      (x.prototype.removeAllListeners = function (e) {
        var t = u.prototype.removeAllListeners.apply(this, arguments);
        return (("readable" !== e && void 0 !== e) || o.nextTick(C, this), t);
      }),
      (x.prototype.resume = function () {
        var e = this._readableState;
        return (
          e.flowing ||
            (l("resume"),
            (e.flowing = !e.readableListening),
            (function (e, t) {
              t.resumeScheduled ||
                ((t.resumeScheduled = !0), o.nextTick(N, e, t));
            })(this, e)),
          (e.paused = !1),
          this
        );
      }),
      (x.prototype.pause = function () {
        return (
          l("call pause flowing=%j", this._readableState.flowing),
          !1 !== this._readableState.flowing &&
            (l("pause"),
            (this._readableState.flowing = !1),
            this.emit("pause")),
          (this._readableState.paused = !0),
          this
        );
      }),
      (x.prototype.wrap = function (e) {
        var t = this,
          r = this._readableState,
          n = !1;
        for (var o in (e.on("end", function () {
          if ((l("wrapped end"), r.decoder && !r.ended)) {
            var e = r.decoder.end();
            e && e.length && t.push(e);
          }
          t.push(null);
        }),
        e.on("data", function (o) {
          (l("wrapped data"),
          r.decoder && (o = r.decoder.write(o)),
          r.objectMode && null == o) ||
            ((r.objectMode || (o && o.length)) &&
              (t.push(o) || ((n = !0), e.pause())));
        }),
        e))
          void 0 === this[o] &&
            "function" == typeof e[o] &&
            (this[o] = (function (t) {
              return function () {
                return e[t].apply(e, arguments);
              };
            })(o));
        for (var i = 0; i < A.length; i++)
          e.on(A[i], this.emit.bind(this, A[i]));
        return (
          (this._read = function (t) {
            (l("wrapped _read", t), n && ((n = !1), e.resume()));
          }),
          this
        );
      }),
      "function" == typeof Symbol &&
        (x.prototype[Symbol.asyncIterator] = function () {
          return (void 0 === h && (h = i("dPaL6")), h(this));
        }),
      Object.defineProperty(x.prototype, "readableHighWaterMark", {
        enumerable: !1,
        get: function () {
          return this._readableState.highWaterMark;
        },
      }),
      Object.defineProperty(x.prototype, "readableBuffer", {
        enumerable: !1,
        get: function () {
          return this._readableState && this._readableState.buffer;
        },
      }),
      Object.defineProperty(x.prototype, "readableFlowing", {
        enumerable: !1,
        get: function () {
          return this._readableState.flowing;
        },
        set: function (e) {
          this._readableState && (this._readableState.flowing = e);
        },
      }),
      (x._fromList = M),
      Object.defineProperty(x.prototype, "readableLength", {
        enumerable: !1,
        get: function () {
          return this._readableState.length;
        },
      }),
      "function" == typeof Symbol &&
        (x.from = function (e, t) {
          return (void 0 === d && (d = i("2kWmT")), d(x, e, t));
        }));
  }),
  i.register("duDpq", function (e, t) {
    e.exports = i("142Mh").EventEmitter;
  }),
  i.register("faMnJ", function (e, t) {}),
  i.register("fW2vO", function (e, t) {
    function r(e, t) {
      var r = Object.keys(e);
      if (Object.getOwnPropertySymbols) {
        var n = Object.getOwnPropertySymbols(e);
        (t &&
          (n = n.filter(function (t) {
            return Object.getOwnPropertyDescriptor(e, t).enumerable;
          })),
          r.push.apply(r, n));
      }
      return r;
    }
    function n(e) {
      for (var t = 1; t < arguments.length; t++) {
        var n = null != arguments[t] ? arguments[t] : {};
        t % 2
          ? r(Object(n), !0).forEach(function (t) {
              o(e, t, n[t]);
            })
          : Object.getOwnPropertyDescriptors
            ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n))
            : r(Object(n)).forEach(function (t) {
                Object.defineProperty(
                  e,
                  t,
                  Object.getOwnPropertyDescriptor(n, t),
                );
              });
      }
      return e;
    }
    function o(e, t, r) {
      return (
        (t = u(t)) in e
          ? Object.defineProperty(e, t, {
              value: r,
              enumerable: !0,
              configurable: !0,
              writable: !0,
            })
          : (e[t] = r),
        e
      );
    }
    function a(e, t) {
      for (var r = 0; r < t.length; r++) {
        var n = t[r];
        ((n.enumerable = n.enumerable || !1),
          (n.configurable = !0),
          "value" in n && (n.writable = !0),
          Object.defineProperty(e, u(n.key), n));
      }
    }
    function u(e) {
      var t = (function (e, t) {
        if ("object" != typeof e || null === e) return e;
        var r = e[Symbol.toPrimitive];
        if (void 0 !== r) {
          var n = r.call(e, t || "default");
          if ("object" != typeof n) return n;
          throw new TypeError("@@toPrimitive must return a primitive value.");
        }
        return ("string" === t ? String : Number)(e);
      })(e, "string");
      return "symbol" == typeof t ? t : String(t);
    }
    var s = i("69fUi").Buffer,
      c = i("faMnJ").inspect,
      l = (c && c.custom) || "inspect";
    e.exports = (function () {
      function e() {
        (!(function (e, t) {
          if (!(e instanceof t))
            throw new TypeError("Cannot call a class as a function");
        })(this, e),
          (this.head = null),
          (this.tail = null),
          (this.length = 0));
      }
      var t, r, o;
      return (
        (t = e),
        (r = [
          {
            key: "push",
            value: function (e) {
              var t = { data: e, next: null };
              (this.length > 0 ? (this.tail.next = t) : (this.head = t),
                (this.tail = t),
                ++this.length);
            },
          },
          {
            key: "unshift",
            value: function (e) {
              var t = { data: e, next: this.head };
              (0 === this.length && (this.tail = t),
                (this.head = t),
                ++this.length);
            },
          },
          {
            key: "shift",
            value: function () {
              if (0 !== this.length) {
                var e = this.head.data;
                return (
                  1 === this.length
                    ? (this.head = this.tail = null)
                    : (this.head = this.head.next),
                  --this.length,
                  e
                );
              }
            },
          },
          {
            key: "clear",
            value: function () {
              ((this.head = this.tail = null), (this.length = 0));
            },
          },
          {
            key: "join",
            value: function (e) {
              if (0 === this.length) return "";
              for (var t = this.head, r = "" + t.data; (t = t.next);)
                r += e + t.data;
              return r;
            },
          },
          {
            key: "concat",
            value: function (e) {
              if (0 === this.length) return s.alloc(0);
              for (
                var t, r, n, o = s.allocUnsafe(e >>> 0), i = this.head, a = 0;
                i;
              )
                ((t = i.data),
                  (r = o),
                  (n = a),
                  s.prototype.copy.call(t, r, n),
                  (a += i.data.length),
                  (i = i.next));
              return o;
            },
          },
          {
            key: "consume",
            value: function (e, t) {
              var r;
              return (
                e < this.head.data.length
                  ? ((r = this.head.data.slice(0, e)),
                    (this.head.data = this.head.data.slice(e)))
                  : (r =
                      e === this.head.data.length
                        ? this.shift()
                        : t
                          ? this._getString(e)
                          : this._getBuffer(e)),
                r
              );
            },
          },
          {
            key: "first",
            value: function () {
              return this.head.data;
            },
          },
          {
            key: "_getString",
            value: function (e) {
              var t = this.head,
                r = 1,
                n = t.data;
              for (e -= n.length; (t = t.next);) {
                var o = t.data,
                  i = e > o.length ? o.length : e;
                if (
                  (i === o.length ? (n += o) : (n += o.slice(0, e)),
                  0 == (e -= i))
                ) {
                  i === o.length
                    ? (++r,
                      t.next
                        ? (this.head = t.next)
                        : (this.head = this.tail = null))
                    : ((this.head = t), (t.data = o.slice(i)));
                  break;
                }
                ++r;
              }
              return ((this.length -= r), n);
            },
          },
          {
            key: "_getBuffer",
            value: function (e) {
              var t = s.allocUnsafe(e),
                r = this.head,
                n = 1;
              for (r.data.copy(t), e -= r.data.length; (r = r.next);) {
                var o = r.data,
                  i = e > o.length ? o.length : e;
                if ((o.copy(t, t.length - e, 0, i), 0 == (e -= i))) {
                  i === o.length
                    ? (++n,
                      r.next
                        ? (this.head = r.next)
                        : (this.head = this.tail = null))
                    : ((this.head = r), (r.data = o.slice(i)));
                  break;
                }
                ++n;
              }
              return ((this.length -= n), t);
            },
          },
          {
            key: l,
            value: function (e, t) {
              return c(this, n(n({}, t), {}, { depth: 0, customInspect: !1 }));
            },
          },
        ]) && a(t.prototype, r),
        o && a(t, o),
        Object.defineProperty(t, "prototype", { writable: !1 }),
        e
      );
    })();
  }),
  i.register("eSPuu", function (e, t) {
    var r = i("kIky1");
    function n(e, t) {
      (a(e, t), o(e));
    }
    function o(e) {
      (e._writableState && !e._writableState.emitClose) ||
        (e._readableState && !e._readableState.emitClose) ||
        e.emit("close");
    }
    function a(e, t) {
      e.emit("error", t);
    }
    e.exports = {
      destroy: function (e, t) {
        var i = this,
          u = this._readableState && this._readableState.destroyed,
          s = this._writableState && this._writableState.destroyed;
        return u || s
          ? (t
              ? t(e)
              : e &&
                (this._writableState
                  ? this._writableState.errorEmitted ||
                    ((this._writableState.errorEmitted = !0),
                    r.nextTick(a, this, e))
                  : r.nextTick(a, this, e)),
            this)
          : (this._readableState && (this._readableState.destroyed = !0),
            this._writableState && (this._writableState.destroyed = !0),
            this._destroy(e || null, function (e) {
              !t && e
                ? i._writableState
                  ? i._writableState.errorEmitted
                    ? r.nextTick(o, i)
                    : ((i._writableState.errorEmitted = !0),
                      r.nextTick(n, i, e))
                  : r.nextTick(n, i, e)
                : t
                  ? (r.nextTick(o, i), t(e))
                  : r.nextTick(o, i);
            }),
            this);
      },
      undestroy: function () {
        (this._readableState &&
          ((this._readableState.destroyed = !1),
          (this._readableState.reading = !1),
          (this._readableState.ended = !1),
          (this._readableState.endEmitted = !1)),
          this._writableState &&
            ((this._writableState.destroyed = !1),
            (this._writableState.ended = !1),
            (this._writableState.ending = !1),
            (this._writableState.finalCalled = !1),
            (this._writableState.prefinished = !1),
            (this._writableState.finished = !1),
            (this._writableState.errorEmitted = !1)));
      },
      errorOrDestroy: function (e, t) {
        var r = e._readableState,
          n = e._writableState;
        (r && r.autoDestroy) || (n && n.autoDestroy)
          ? e.destroy(t)
          : e.emit("error", t);
      },
    };
  }),
  i.register("6r8gG", function (e, t) {
    var r = i("2H4BZ").codes.ERR_INVALID_OPT_VALUE;
    e.exports = {
      getHighWaterMark: function (e, t, n, o) {
        var i = (function (e, t, r) {
          return null != e.highWaterMark ? e.highWaterMark : t ? e[r] : null;
        })(t, o, n);
        if (null != i) {
          if (!isFinite(i) || Math.floor(i) !== i || i < 0)
            throw new r(o ? n : "highWaterMark", i);
          return Math.floor(i);
        }
        return e.objectMode ? 16 : 16384;
      },
    };
  }),
  i.register("2H4BZ", function (t, r) {
    var n;
    e(
      t.exports,
      "codes",
      () => n,
      (e) => (n = e),
    );
    var o = {};
    function i(e, t, r) {
      r || (r = Error);
      var n = (function (e) {
        var r, n;
        function o(r, n, o) {
          return (
            e.call(
              this,
              (function (e, r, n) {
                return "string" == typeof t ? t : t(e, r, n);
              })(r, n, o),
            ) || this
          );
        }
        return (
          (n = e),
          ((r = o).prototype = Object.create(n.prototype)),
          (r.prototype.constructor = r),
          (r.__proto__ = n),
          o
        );
      })(r);
      ((n.prototype.name = r.name), (n.prototype.code = e), (o[e] = n));
    }
    function a(e, t) {
      if (Array.isArray(e)) {
        var r = e.length;
        return (
          (e = e.map(function (e) {
            return String(e);
          })),
          r > 2
            ? "one of "
                .concat(t, " ")
                .concat(e.slice(0, r - 1).join(", "), ", or ") + e[r - 1]
            : 2 === r
              ? "one of ".concat(t, " ").concat(e[0], " or ").concat(e[1])
              : "of ".concat(t, " ").concat(e[0])
        );
      }
      return "of ".concat(t, " ").concat(String(e));
    }
    (i(
      "ERR_INVALID_OPT_VALUE",
      function (e, t) {
        return 'The value "' + t + '" is invalid for option "' + e + '"';
      },
      TypeError,
    ),
      i(
        "ERR_INVALID_ARG_TYPE",
        function (e, t, r) {
          var n, o, i, u;
          if (
            ("string" == typeof t &&
            ((o = "not "), t.substr(!i || i < 0 ? 0 : +i, o.length) === o)
              ? ((n = "must not be"), (t = t.replace(/^not /, "")))
              : (n = "must be"),
            (function (e, t, r) {
              return (
                (void 0 === r || r > e.length) && (r = e.length),
                e.substring(r - t.length, r) === t
              );
            })(e, " argument"))
          )
            u = "The ".concat(e, " ").concat(n, " ").concat(a(t, "type"));
          else {
            var s = (function (e, t, r) {
              return (
                "number" != typeof r && (r = 0),
                !(r + t.length > e.length) && -1 !== e.indexOf(t, r)
              );
            })(e, ".")
              ? "property"
              : "argument";
            u = 'The "'
              .concat(e, '" ')
              .concat(s, " ")
              .concat(n, " ")
              .concat(a(t, "type"));
          }
          return (u += ". Received type ".concat(typeof r));
        },
        TypeError,
      ),
      i("ERR_STREAM_PUSH_AFTER_EOF", "stream.push() after EOF"),
      i("ERR_METHOD_NOT_IMPLEMENTED", function (e) {
        return "The " + e + " method is not implemented";
      }),
      i("ERR_STREAM_PREMATURE_CLOSE", "Premature close"),
      i("ERR_STREAM_DESTROYED", function (e) {
        return "Cannot call " + e + " after a stream was destroyed";
      }),
      i("ERR_MULTIPLE_CALLBACK", "Callback called multiple times"),
      i("ERR_STREAM_CANNOT_PIPE", "Cannot pipe, not readable"),
      i("ERR_STREAM_WRITE_AFTER_END", "write after end"),
      i(
        "ERR_STREAM_NULL_VALUES",
        "May not write null values to stream",
        TypeError,
      ),
      i(
        "ERR_UNKNOWN_ENCODING",
        function (e) {
          return "Unknown encoding: " + e;
        },
        TypeError,
      ),
      i(
        "ERR_STREAM_UNSHIFT_AFTER_END_EVENT",
        "stream.unshift() after end event",
      ),
      (n = o));
  }),
  i.register("ilj3k", function (e, t) {
    var r = i("kIky1"),
      n =
        Object.keys ||
        function (e) {
          var t = [];
          for (var r in e) t.push(r);
          return t;
        };
    e.exports = l;
    var o = i("97FLL"),
      a = i("aeAI7");
    i("2jKWR")(l, o);
    for (var u = n(a.prototype), s = 0; s < u.length; s++) {
      var c = u[s];
      l.prototype[c] || (l.prototype[c] = a.prototype[c]);
    }
    function l(e) {
      if (!(this instanceof l)) return new l(e);
      (o.call(this, e),
        a.call(this, e),
        (this.allowHalfOpen = !0),
        e &&
          (!1 === e.readable && (this.readable = !1),
          !1 === e.writable && (this.writable = !1),
          !1 === e.allowHalfOpen &&
            ((this.allowHalfOpen = !1), this.once("end", f))));
    }
    function f() {
      this._writableState.ended || r.nextTick(p, this);
    }
    function p(e) {
      e.end();
    }
    (Object.defineProperty(l.prototype, "writableHighWaterMark", {
      enumerable: !1,
      get: function () {
        return this._writableState.highWaterMark;
      },
    }),
      Object.defineProperty(l.prototype, "writableBuffer", {
        enumerable: !1,
        get: function () {
          return this._writableState && this._writableState.getBuffer();
        },
      }),
      Object.defineProperty(l.prototype, "writableLength", {
        enumerable: !1,
        get: function () {
          return this._writableState.length;
        },
      }),
      Object.defineProperty(l.prototype, "destroyed", {
        enumerable: !1,
        get: function () {
          return (
            void 0 !== this._readableState &&
            void 0 !== this._writableState &&
            this._readableState.destroyed &&
            this._writableState.destroyed
          );
        },
        set: function (e) {
          void 0 !== this._readableState &&
            void 0 !== this._writableState &&
            ((this._readableState.destroyed = e),
            (this._writableState.destroyed = e));
        },
      }));
  }),
  i.register("aeAI7", function (e, t) {
    var n,
      o = i("kIky1");
    function a(e) {
      var t = this;
      ((this.next = null),
        (this.entry = null),
        (this.finish = function () {
          !(function (e, t, r) {
            var n = e.entry;
            e.entry = null;
            for (; n;) {
              var o = n.callback;
              (t.pendingcb--, o(r), (n = n.next));
            }
            t.corkedRequestsFree.next = e;
          })(t, e);
        }));
    }
    ((e.exports = x), (x.WritableState = O));
    var u = { deprecate: i("aaAzx") },
      s = i("duDpq"),
      c = i("69fUi").Buffer,
      l =
        (void 0 !== r
          ? r
          : "undefined" != typeof window
            ? window
            : "undefined" != typeof self
              ? self
              : {}
        ).Uint8Array || function () {};
    var f,
      p = i("eSPuu"),
      h = i("6r8gG").getHighWaterMark,
      d = i("2H4BZ").codes,
      y = d.ERR_INVALID_ARG_TYPE,
      g = d.ERR_METHOD_NOT_IMPLEMENTED,
      v = d.ERR_MULTIPLE_CALLBACK,
      m = d.ERR_STREAM_CANNOT_PIPE,
      b = d.ERR_STREAM_DESTROYED,
      w = d.ERR_STREAM_NULL_VALUES,
      E = d.ERR_STREAM_WRITE_AFTER_END,
      _ = d.ERR_UNKNOWN_ENCODING,
      S = p.errorOrDestroy;
    function A() {}
    function O(e, t, r) {
      ((n = n || i("ilj3k")),
        (e = e || {}),
        "boolean" != typeof r && (r = t instanceof n),
        (this.objectMode = !!e.objectMode),
        r && (this.objectMode = this.objectMode || !!e.writableObjectMode),
        (this.highWaterMark = h(this, e, "writableHighWaterMark", r)),
        (this.finalCalled = !1),
        (this.needDrain = !1),
        (this.ending = !1),
        (this.ended = !1),
        (this.finished = !1),
        (this.destroyed = !1));
      var u = !1 === e.decodeStrings;
      ((this.decodeStrings = !u),
        (this.defaultEncoding = e.defaultEncoding || "utf8"),
        (this.length = 0),
        (this.writing = !1),
        (this.corked = 0),
        (this.sync = !0),
        (this.bufferProcessing = !1),
        (this.onwrite = function (e) {
          !(function (e, t) {
            var r = e._writableState,
              n = r.sync,
              i = r.writecb;
            if ("function" != typeof i) throw new v();
            if (
              ((function (e) {
                ((e.writing = !1),
                  (e.writecb = null),
                  (e.length -= e.writelen),
                  (e.writelen = 0));
              })(r),
              t)
            )
              !(function (e, t, r, n, i) {
                (--t.pendingcb,
                  r
                    ? (o.nextTick(i, n),
                      o.nextTick(I, e, t),
                      (e._writableState.errorEmitted = !0),
                      S(e, n))
                    : (i(n),
                      (e._writableState.errorEmitted = !0),
                      S(e, n),
                      I(e, t)));
              })(e, r, n, t, i);
            else {
              var a = R(r) || e.destroyed;
              (a ||
                r.corked ||
                r.bufferProcessing ||
                !r.bufferedRequest ||
                P(e, r),
                n ? o.nextTick(j, e, r, a, i) : j(e, r, a, i));
            }
          })(t, e);
        }),
        (this.writecb = null),
        (this.writelen = 0),
        (this.bufferedRequest = null),
        (this.lastBufferedRequest = null),
        (this.pendingcb = 0),
        (this.prefinished = !1),
        (this.errorEmitted = !1),
        (this.emitClose = !1 !== e.emitClose),
        (this.autoDestroy = !!e.autoDestroy),
        (this.bufferedRequestCount = 0),
        (this.corkedRequestsFree = new a(this)));
    }
    function x(e) {
      var t = this instanceof (n = n || i("ilj3k"));
      if (!t && !f.call(x, this)) return new x(e);
      ((this._writableState = new O(e, this, t)),
        (this.writable = !0),
        e &&
          ("function" == typeof e.write && (this._write = e.write),
          "function" == typeof e.writev && (this._writev = e.writev),
          "function" == typeof e.destroy && (this._destroy = e.destroy),
          "function" == typeof e.final && (this._final = e.final)),
        s.call(this));
    }
    function k(e, t, r, n, o, i, a) {
      ((t.writelen = n),
        (t.writecb = a),
        (t.writing = !0),
        (t.sync = !0),
        t.destroyed
          ? t.onwrite(new b("write"))
          : r
            ? e._writev(o, t.onwrite)
            : e._write(o, i, t.onwrite),
        (t.sync = !1));
    }
    function j(e, t, r, n) {
      (r ||
        (function (e, t) {
          0 === t.length &&
            t.needDrain &&
            ((t.needDrain = !1), e.emit("drain"));
        })(e, t),
        t.pendingcb--,
        n(),
        I(e, t));
    }
    function P(e, t) {
      t.bufferProcessing = !0;
      var r = t.bufferedRequest;
      if (e._writev && r && r.next) {
        var n = t.bufferedRequestCount,
          o = new Array(n),
          i = t.corkedRequestsFree;
        i.entry = r;
        for (var u = 0, s = !0; r;)
          ((o[u] = r), r.isBuf || (s = !1), (r = r.next), (u += 1));
        ((o.allBuffers = s),
          k(e, t, !0, t.length, o, "", i.finish),
          t.pendingcb++,
          (t.lastBufferedRequest = null),
          i.next
            ? ((t.corkedRequestsFree = i.next), (i.next = null))
            : (t.corkedRequestsFree = new a(t)),
          (t.bufferedRequestCount = 0));
      } else {
        for (; r;) {
          var c = r.chunk,
            l = r.encoding,
            f = r.callback;
          if (
            (k(e, t, !1, t.objectMode ? 1 : c.length, c, l, f),
            (r = r.next),
            t.bufferedRequestCount--,
            t.writing)
          )
            break;
        }
        null === r && (t.lastBufferedRequest = null);
      }
      ((t.bufferedRequest = r), (t.bufferProcessing = !1));
    }
    function R(e) {
      return (
        e.ending &&
        0 === e.length &&
        null === e.bufferedRequest &&
        !e.finished &&
        !e.writing
      );
    }
    function T(e, t) {
      e._final(function (r) {
        (t.pendingcb--,
          r && S(e, r),
          (t.prefinished = !0),
          e.emit("prefinish"),
          I(e, t));
      });
    }
    function I(e, t) {
      var r = R(t);
      if (
        r &&
        ((function (e, t) {
          t.prefinished ||
            t.finalCalled ||
            ("function" != typeof e._final || t.destroyed
              ? ((t.prefinished = !0), e.emit("prefinish"))
              : (t.pendingcb++, (t.finalCalled = !0), o.nextTick(T, e, t)));
        })(e, t),
        0 === t.pendingcb &&
          ((t.finished = !0), e.emit("finish"), t.autoDestroy))
      ) {
        var n = e._readableState;
        (!n || (n.autoDestroy && n.endEmitted)) && e.destroy();
      }
      return r;
    }
    (i("2jKWR")(x, s),
      (O.prototype.getBuffer = function () {
        for (var e = this.bufferedRequest, t = []; e;)
          (t.push(e), (e = e.next));
        return t;
      }),
      (function () {
        try {
          Object.defineProperty(O.prototype, "buffer", {
            get: u.deprecate(
              function () {
                return this.getBuffer();
              },
              "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.",
              "DEP0003",
            ),
          });
        } catch (e) {}
      })(),
      "function" == typeof Symbol &&
      Symbol.hasInstance &&
      "function" == typeof Function.prototype[Symbol.hasInstance]
        ? ((f = Function.prototype[Symbol.hasInstance]),
          Object.defineProperty(x, Symbol.hasInstance, {
            value: function (e) {
              return (
                !!f.call(this, e) ||
                (this === x && e && e._writableState instanceof O)
              );
            },
          }))
        : (f = function (e) {
            return e instanceof this;
          }),
      (x.prototype.pipe = function () {
        S(this, new m());
      }),
      (x.prototype.write = function (e, t, r) {
        var n,
          i = this._writableState,
          a = !1,
          u = !i.objectMode && ((n = e), c.isBuffer(n) || n instanceof l);
        return (
          u &&
            !c.isBuffer(e) &&
            (e = (function (e) {
              return c.from(e);
            })(e)),
          "function" == typeof t && ((r = t), (t = null)),
          u ? (t = "buffer") : t || (t = i.defaultEncoding),
          "function" != typeof r && (r = A),
          i.ending
            ? (function (e, t) {
                var r = new E();
                (S(e, r), o.nextTick(t, r));
              })(this, r)
            : (u ||
                (function (e, t, r, n) {
                  var i;
                  return (
                    null === r
                      ? (i = new w())
                      : "string" == typeof r ||
                        t.objectMode ||
                        (i = new y("chunk", ["string", "Buffer"], r)),
                    !i || (S(e, i), o.nextTick(n, i), !1)
                  );
                })(this, i, e, r)) &&
              (i.pendingcb++,
              (a = (function (e, t, r, n, o, i) {
                if (!r) {
                  var a = (function (e, t, r) {
                    e.objectMode ||
                      !1 === e.decodeStrings ||
                      "string" != typeof t ||
                      (t = c.from(t, r));
                    return t;
                  })(t, n, o);
                  n !== a && ((r = !0), (o = "buffer"), (n = a));
                }
                var u = t.objectMode ? 1 : n.length;
                t.length += u;
                var s = t.length < t.highWaterMark;
                s || (t.needDrain = !0);
                if (t.writing || t.corked) {
                  var l = t.lastBufferedRequest;
                  ((t.lastBufferedRequest = {
                    chunk: n,
                    encoding: o,
                    isBuf: r,
                    callback: i,
                    next: null,
                  }),
                    l
                      ? (l.next = t.lastBufferedRequest)
                      : (t.bufferedRequest = t.lastBufferedRequest),
                    (t.bufferedRequestCount += 1));
                } else k(e, t, !1, u, n, o, i);
                return s;
              })(this, i, u, e, t, r))),
          a
        );
      }),
      (x.prototype.cork = function () {
        this._writableState.corked++;
      }),
      (x.prototype.uncork = function () {
        var e = this._writableState;
        e.corked &&
          (e.corked--,
          e.writing ||
            e.corked ||
            e.bufferProcessing ||
            !e.bufferedRequest ||
            P(this, e));
      }),
      (x.prototype.setDefaultEncoding = function (e) {
        if (
          ("string" == typeof e && (e = e.toLowerCase()),
          !(
            [
              "hex",
              "utf8",
              "utf-8",
              "ascii",
              "binary",
              "base64",
              "ucs2",
              "ucs-2",
              "utf16le",
              "utf-16le",
              "raw",
            ].indexOf((e + "").toLowerCase()) > -1
          ))
        )
          throw new _(e);
        return ((this._writableState.defaultEncoding = e), this);
      }),
      Object.defineProperty(x.prototype, "writableBuffer", {
        enumerable: !1,
        get: function () {
          return this._writableState && this._writableState.getBuffer();
        },
      }),
      Object.defineProperty(x.prototype, "writableHighWaterMark", {
        enumerable: !1,
        get: function () {
          return this._writableState.highWaterMark;
        },
      }),
      (x.prototype._write = function (e, t, r) {
        r(new g("_write()"));
      }),
      (x.prototype._writev = null),
      (x.prototype.end = function (e, t, r) {
        var n = this._writableState;
        return (
          "function" == typeof e
            ? ((r = e), (e = null), (t = null))
            : "function" == typeof t && ((r = t), (t = null)),
          null != e && this.write(e, t),
          n.corked && ((n.corked = 1), this.uncork()),
          n.ending ||
            (function (e, t, r) {
              ((t.ending = !0),
                I(e, t),
                r && (t.finished ? o.nextTick(r) : e.once("finish", r)));
              ((t.ended = !0), (e.writable = !1));
            })(this, n, r),
          this
        );
      }),
      Object.defineProperty(x.prototype, "writableLength", {
        enumerable: !1,
        get: function () {
          return this._writableState.length;
        },
      }),
      Object.defineProperty(x.prototype, "destroyed", {
        enumerable: !1,
        get: function () {
          return (
            void 0 !== this._writableState && this._writableState.destroyed
          );
        },
        set: function (e) {
          this._writableState && (this._writableState.destroyed = e);
        },
      }),
      (x.prototype.destroy = p.destroy),
      (x.prototype._undestroy = p.undestroy),
      (x.prototype._destroy = function (e, t) {
        t(e);
      }));
  }),
  i.register("aaAzx", function (e, t) {
    function n(e) {
      try {
        if (!r.localStorage) return !1;
      } catch (e) {
        return !1;
      }
      var t = r.localStorage[e];
      return null != t && "true" === String(t).toLowerCase();
    }
    e.exports = function (e, t) {
      if (n("noDeprecation")) return e;
      var r = !1;
      return function () {
        if (!r) {
          if (n("throwDeprecation")) throw new Error(t);
          (n("traceDeprecation") ? console.trace(t) : console.warn(t),
            (r = !0));
        }
        return e.apply(this, arguments);
      };
    };
  }),
  i.register("lTqX2", function (t, r) {
    var n;
    e(
      t.exports,
      "StringDecoder",
      () => n,
      (e) => (n = e),
    );
    var o = i("5YEPZ").Buffer,
      a =
        o.isEncoding ||
        function (e) {
          switch ((e = "" + e) && e.toLowerCase()) {
            case "hex":
            case "utf8":
            case "utf-8":
            case "ascii":
            case "binary":
            case "base64":
            case "ucs2":
            case "ucs-2":
            case "utf16le":
            case "utf-16le":
            case "raw":
              return !0;
            default:
              return !1;
          }
        };
    function u(e) {
      var t;
      switch (
        ((this.encoding = (function (e) {
          var t = (function (e) {
            if (!e) return "utf8";
            for (var t; ;)
              switch (e) {
                case "utf8":
                case "utf-8":
                  return "utf8";
                case "ucs2":
                case "ucs-2":
                case "utf16le":
                case "utf-16le":
                  return "utf16le";
                case "latin1":
                case "binary":
                  return "latin1";
                case "base64":
                case "ascii":
                case "hex":
                  return e;
                default:
                  if (t) return;
                  ((e = ("" + e).toLowerCase()), (t = !0));
              }
          })(e);
          if ("string" != typeof t && (o.isEncoding === a || !a(e)))
            throw new Error("Unknown encoding: " + e);
          return t || e;
        })(e)),
        this.encoding)
      ) {
        case "utf16le":
          ((this.text = l), (this.end = f), (t = 4));
          break;
        case "utf8":
          ((this.fillLast = c), (t = 4));
          break;
        case "base64":
          ((this.text = p), (this.end = h), (t = 3));
          break;
        default:
          return ((this.write = d), void (this.end = y));
      }
      ((this.lastNeed = 0),
        (this.lastTotal = 0),
        (this.lastChar = o.allocUnsafe(t)));
    }
    function s(e) {
      return e <= 127
        ? 0
        : e >> 5 == 6
          ? 2
          : e >> 4 == 14
            ? 3
            : e >> 3 == 30
              ? 4
              : e >> 6 == 2
                ? -1
                : -2;
    }
    function c(e) {
      var t = this.lastTotal - this.lastNeed,
        r = (function (e, t, r) {
          if (128 != (192 & t[0])) return ((e.lastNeed = 0), "�");
          if (e.lastNeed > 1 && t.length > 1) {
            if (128 != (192 & t[1])) return ((e.lastNeed = 1), "�");
            if (e.lastNeed > 2 && t.length > 2 && 128 != (192 & t[2]))
              return ((e.lastNeed = 2), "�");
          }
        })(this, e);
      return void 0 !== r
        ? r
        : this.lastNeed <= e.length
          ? (e.copy(this.lastChar, t, 0, this.lastNeed),
            this.lastChar.toString(this.encoding, 0, this.lastTotal))
          : (e.copy(this.lastChar, t, 0, e.length),
            void (this.lastNeed -= e.length));
    }
    function l(e, t) {
      if ((e.length - t) % 2 == 0) {
        var r = e.toString("utf16le", t);
        if (r) {
          var n = r.charCodeAt(r.length - 1);
          if (n >= 55296 && n <= 56319)
            return (
              (this.lastNeed = 2),
              (this.lastTotal = 4),
              (this.lastChar[0] = e[e.length - 2]),
              (this.lastChar[1] = e[e.length - 1]),
              r.slice(0, -1)
            );
        }
        return r;
      }
      return (
        (this.lastNeed = 1),
        (this.lastTotal = 2),
        (this.lastChar[0] = e[e.length - 1]),
        e.toString("utf16le", t, e.length - 1)
      );
    }
    function f(e) {
      var t = e && e.length ? this.write(e) : "";
      if (this.lastNeed) {
        var r = this.lastTotal - this.lastNeed;
        return t + this.lastChar.toString("utf16le", 0, r);
      }
      return t;
    }
    function p(e, t) {
      var r = (e.length - t) % 3;
      return 0 === r
        ? e.toString("base64", t)
        : ((this.lastNeed = 3 - r),
          (this.lastTotal = 3),
          1 === r
            ? (this.lastChar[0] = e[e.length - 1])
            : ((this.lastChar[0] = e[e.length - 2]),
              (this.lastChar[1] = e[e.length - 1])),
          e.toString("base64", t, e.length - r));
    }
    function h(e) {
      var t = e && e.length ? this.write(e) : "";
      return this.lastNeed
        ? t + this.lastChar.toString("base64", 0, 3 - this.lastNeed)
        : t;
    }
    function d(e) {
      return e.toString(this.encoding);
    }
    function y(e) {
      return e && e.length ? this.write(e) : "";
    }
    ((n = u),
      (u.prototype.write = function (e) {
        if (0 === e.length) return "";
        var t, r;
        if (this.lastNeed) {
          if (void 0 === (t = this.fillLast(e))) return "";
          ((r = this.lastNeed), (this.lastNeed = 0));
        } else r = 0;
        return r < e.length
          ? t
            ? t + this.text(e, r)
            : this.text(e, r)
          : t || "";
      }),
      (u.prototype.end = function (e) {
        var t = e && e.length ? this.write(e) : "";
        return this.lastNeed ? t + "�" : t;
      }),
      (u.prototype.text = function (e, t) {
        var r = (function (e, t, r) {
          var n = t.length - 1;
          if (n < r) return 0;
          var o = s(t[n]);
          if (o >= 0) return (o > 0 && (e.lastNeed = o - 1), o);
          if (--n < r || -2 === o) return 0;
          if (((o = s(t[n])), o >= 0))
            return (o > 0 && (e.lastNeed = o - 2), o);
          if (--n < r || -2 === o) return 0;
          if (((o = s(t[n])), o >= 0))
            return (o > 0 && (2 === o ? (o = 0) : (e.lastNeed = o - 3)), o);
          return 0;
        })(this, e, t);
        if (!this.lastNeed) return e.toString("utf8", t);
        this.lastTotal = r;
        var n = e.length - (r - this.lastNeed);
        return (e.copy(this.lastChar, 0, n), e.toString("utf8", t, n));
      }),
      (u.prototype.fillLast = function (e) {
        if (this.lastNeed <= e.length)
          return (
            e.copy(
              this.lastChar,
              this.lastTotal - this.lastNeed,
              0,
              this.lastNeed,
            ),
            this.lastChar.toString(this.encoding, 0, this.lastTotal)
          );
        (e.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, e.length),
          (this.lastNeed -= e.length));
      }));
  }),
  i.register("5YEPZ", function (e, t) {
    /*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
    var r = i("69fUi"),
      n = r.Buffer;
    function o(e, t) {
      for (var r in e) t[r] = e[r];
    }
    function a(e, t, r) {
      return n(e, t, r);
    }
    (n.from && n.alloc && n.allocUnsafe && n.allocUnsafeSlow
      ? (e.exports = r)
      : (o(r, e.exports), (e.exports.Buffer = a)),
      (a.prototype = Object.create(n.prototype)),
      o(n, a),
      (a.from = function (e, t, r) {
        if ("number" == typeof e)
          throw new TypeError("Argument must not be a number");
        return n(e, t, r);
      }),
      (a.alloc = function (e, t, r) {
        if ("number" != typeof e)
          throw new TypeError("Argument must be a number");
        var o = n(e);
        return (
          void 0 !== t
            ? "string" == typeof r
              ? o.fill(t, r)
              : o.fill(t)
            : o.fill(0),
          o
        );
      }),
      (a.allocUnsafe = function (e) {
        if ("number" != typeof e)
          throw new TypeError("Argument must be a number");
        return n(e);
      }),
      (a.allocUnsafeSlow = function (e) {
        if ("number" != typeof e)
          throw new TypeError("Argument must be a number");
        return r.SlowBuffer(e);
      }));
  }),
  i.register("dPaL6", function (e, t) {
    var r,
      n = i("kIky1");
    function o(e, t, r) {
      return (
        (t = (function (e) {
          var t = (function (e, t) {
            if ("object" != typeof e || null === e) return e;
            var r = e[Symbol.toPrimitive];
            if (void 0 !== r) {
              var n = r.call(e, t || "default");
              if ("object" != typeof n) return n;
              throw new TypeError(
                "@@toPrimitive must return a primitive value.",
              );
            }
            return ("string" === t ? String : Number)(e);
          })(e, "string");
          return "symbol" == typeof t ? t : String(t);
        })(t)) in e
          ? Object.defineProperty(e, t, {
              value: r,
              enumerable: !0,
              configurable: !0,
              writable: !0,
            })
          : (e[t] = r),
        e
      );
    }
    var a = i("dG6Tn"),
      u = Symbol("lastResolve"),
      s = Symbol("lastReject"),
      c = Symbol("error"),
      l = Symbol("ended"),
      f = Symbol("lastPromise"),
      p = Symbol("handlePromise"),
      h = Symbol("stream");
    function d(e, t) {
      return { value: e, done: t };
    }
    function y(e) {
      var t = e[u];
      if (null !== t) {
        var r = e[h].read();
        null !== r &&
          ((e[f] = null), (e[u] = null), (e[s] = null), t(d(r, !1)));
      }
    }
    function g(e) {
      n.nextTick(y, e);
    }
    var v = Object.getPrototypeOf(function () {}),
      m = Object.setPrototypeOf(
        (o(
          (r = {
            get stream() {
              return this[h];
            },
            next: function () {
              var e = this,
                t = this[c];
              if (null !== t) return Promise.reject(t);
              if (this[l]) return Promise.resolve(d(void 0, !0));
              if (this[h].destroyed)
                return new Promise(function (t, r) {
                  n.nextTick(function () {
                    e[c] ? r(e[c]) : t(d(void 0, !0));
                  });
                });
              var r,
                o = this[f];
              if (o)
                r = new Promise(
                  (function (e, t) {
                    return function (r, n) {
                      e.then(function () {
                        t[l] ? r(d(void 0, !0)) : t[p](r, n);
                      }, n);
                    };
                  })(o, this),
                );
              else {
                var i = this[h].read();
                if (null !== i) return Promise.resolve(d(i, !1));
                r = new Promise(this[p]);
              }
              return ((this[f] = r), r);
            },
          }),
          Symbol.asyncIterator,
          function () {
            return this;
          },
        ),
        o(r, "return", function () {
          var e = this;
          return new Promise(function (t, r) {
            e[h].destroy(null, function (e) {
              e ? r(e) : t(d(void 0, !0));
            });
          });
        }),
        r),
        v,
      );
    e.exports = function (e) {
      var t,
        r = Object.create(
          m,
          (o((t = {}), h, { value: e, writable: !0 }),
          o(t, u, { value: null, writable: !0 }),
          o(t, s, { value: null, writable: !0 }),
          o(t, c, { value: null, writable: !0 }),
          o(t, l, { value: e._readableState.endEmitted, writable: !0 }),
          o(t, p, {
            value: function (e, t) {
              var n = r[h].read();
              n
                ? ((r[f] = null), (r[u] = null), (r[s] = null), e(d(n, !1)))
                : ((r[u] = e), (r[s] = t));
            },
            writable: !0,
          }),
          t),
        );
      return (
        (r[f] = null),
        a(e, function (e) {
          if (e && "ERR_STREAM_PREMATURE_CLOSE" !== e.code) {
            var t = r[s];
            return (
              null !== t && ((r[f] = null), (r[u] = null), (r[s] = null), t(e)),
              void (r[c] = e)
            );
          }
          var n = r[u];
          (null !== n &&
            ((r[f] = null), (r[u] = null), (r[s] = null), n(d(void 0, !0))),
            (r[l] = !0));
        }),
        e.on("readable", g.bind(null, r)),
        r
      );
    };
  }),
  i.register("dG6Tn", function (e, t) {
    var r = i("2H4BZ").codes.ERR_STREAM_PREMATURE_CLOSE;
    function n() {}
    e.exports = function e(t, o, i) {
      if ("function" == typeof o) return e(t, null, o);
      (o || (o = {}),
        (i = (function (e) {
          var t = !1;
          return function () {
            if (!t) {
              t = !0;
              for (
                var r = arguments.length, n = new Array(r), o = 0;
                o < r;
                o++
              )
                n[o] = arguments[o];
              e.apply(this, n);
            }
          };
        })(i || n)));
      var a = o.readable || (!1 !== o.readable && t.readable),
        u = o.writable || (!1 !== o.writable && t.writable),
        s = function () {
          t.writable || l();
        },
        c = t._writableState && t._writableState.finished,
        l = function () {
          ((u = !1), (c = !0), a || i.call(t));
        },
        f = t._readableState && t._readableState.endEmitted,
        p = function () {
          ((a = !1), (f = !0), u || i.call(t));
        },
        h = function (e) {
          i.call(t, e);
        },
        d = function () {
          var e;
          return a && !f
            ? ((t._readableState && t._readableState.ended) || (e = new r()),
              i.call(t, e))
            : u && !c
              ? ((t._writableState && t._writableState.ended) || (e = new r()),
                i.call(t, e))
              : void 0;
        },
        y = function () {
          t.req.on("finish", l);
        };
      return (
        !(function (e) {
          return e.setHeader && "function" == typeof e.abort;
        })(t)
          ? u && !t._writableState && (t.on("end", s), t.on("close", s))
          : (t.on("complete", l),
            t.on("abort", d),
            t.req ? y() : t.on("request", y)),
        t.on("end", p),
        t.on("finish", l),
        !1 !== o.error && t.on("error", h),
        t.on("close", d),
        function () {
          (t.removeListener("complete", l),
            t.removeListener("abort", d),
            t.removeListener("request", y),
            t.req && t.req.removeListener("finish", l),
            t.removeListener("end", s),
            t.removeListener("close", s),
            t.removeListener("finish", l),
            t.removeListener("end", p),
            t.removeListener("error", h),
            t.removeListener("close", d));
        }
      );
    };
  }),
  i.register("2kWmT", function (e, t) {
    e.exports = function () {
      throw new Error("Readable.from is not available in the browser");
    };
  }),
  i.register("1fXar", function (e, t) {
    e.exports = l;
    var r = i("2H4BZ").codes,
      n = r.ERR_METHOD_NOT_IMPLEMENTED,
      o = r.ERR_MULTIPLE_CALLBACK,
      a = r.ERR_TRANSFORM_ALREADY_TRANSFORMING,
      u = r.ERR_TRANSFORM_WITH_LENGTH_0,
      s = i("ilj3k");
    function c(e, t) {
      var r = this._transformState;
      r.transforming = !1;
      var n = r.writecb;
      if (null === n) return this.emit("error", new o());
      ((r.writechunk = null),
        (r.writecb = null),
        null != t && this.push(t),
        n(e));
      var i = this._readableState;
      ((i.reading = !1),
        (i.needReadable || i.length < i.highWaterMark) &&
          this._read(i.highWaterMark));
    }
    function l(e) {
      if (!(this instanceof l)) return new l(e);
      (s.call(this, e),
        (this._transformState = {
          afterTransform: c.bind(this),
          needTransform: !1,
          transforming: !1,
          writecb: null,
          writechunk: null,
          writeencoding: null,
        }),
        (this._readableState.needReadable = !0),
        (this._readableState.sync = !1),
        e &&
          ("function" == typeof e.transform && (this._transform = e.transform),
          "function" == typeof e.flush && (this._flush = e.flush)),
        this.on("prefinish", f));
    }
    function f() {
      var e = this;
      "function" != typeof this._flush || this._readableState.destroyed
        ? p(this, null, null)
        : this._flush(function (t, r) {
            p(e, t, r);
          });
    }
    function p(e, t, r) {
      if (t) return e.emit("error", t);
      if ((null != r && e.push(r), e._writableState.length)) throw new u();
      if (e._transformState.transforming) throw new a();
      return e.push(null);
    }
    (i("2jKWR")(l, s),
      (l.prototype.push = function (e, t) {
        return (
          (this._transformState.needTransform = !1),
          s.prototype.push.call(this, e, t)
        );
      }),
      (l.prototype._transform = function (e, t, r) {
        r(new n("_transform()"));
      }),
      (l.prototype._write = function (e, t, r) {
        var n = this._transformState;
        if (
          ((n.writecb = r),
          (n.writechunk = e),
          (n.writeencoding = t),
          !n.transforming)
        ) {
          var o = this._readableState;
          (n.needTransform || o.needReadable || o.length < o.highWaterMark) &&
            this._read(o.highWaterMark);
        }
      }),
      (l.prototype._read = function (e) {
        var t = this._transformState;
        null === t.writechunk || t.transforming
          ? (t.needTransform = !0)
          : ((t.transforming = !0),
            this._transform(t.writechunk, t.writeencoding, t.afterTransform));
      }),
      (l.prototype._destroy = function (e, t) {
        s.prototype._destroy.call(this, e, function (e) {
          t(e);
        });
      }));
  }),
  i.register("8aveM", function (e, t) {
    e.exports = n;
    var r = i("1fXar");
    function n(e) {
      if (!(this instanceof n)) return new n(e);
      r.call(this, e);
    }
    (i("2jKWR")(n, r),
      (n.prototype._transform = function (e, t, r) {
        r(null, e);
      }));
  }),
  i.register("8H9ZT", function (e, t) {
    var r;
    var n = i("2H4BZ").codes,
      o = n.ERR_MISSING_ARGS,
      a = n.ERR_STREAM_DESTROYED;
    function u(e) {
      if (e) throw e;
    }
    function s(e) {
      e();
    }
    function c(e, t) {
      return e.pipe(t);
    }
    e.exports = function () {
      for (var e = arguments.length, t = new Array(e), n = 0; n < e; n++)
        t[n] = arguments[n];
      var l,
        f = (function (e) {
          return e.length
            ? "function" != typeof e[e.length - 1]
              ? u
              : e.pop()
            : u;
        })(t);
      if ((Array.isArray(t[0]) && (t = t[0]), t.length < 2))
        throw new o("streams");
      var p = t.map(function (e, n) {
        var o = n < t.length - 1;
        return (function (e, t, n, o) {
          o = (function (e) {
            var t = !1;
            return function () {
              t || ((t = !0), e.apply(void 0, arguments));
            };
          })(o);
          var u = !1;
          (e.on("close", function () {
            u = !0;
          }),
            void 0 === r && (r = i("dG6Tn")),
            r(e, { readable: t, writable: n }, function (e) {
              if (e) return o(e);
              ((u = !0), o());
            }));
          var s = !1;
          return function (t) {
            if (!u && !s)
              return (
                (s = !0),
                (function (e) {
                  return e.setHeader && "function" == typeof e.abort;
                })(e)
                  ? e.abort()
                  : "function" == typeof e.destroy
                    ? e.destroy()
                    : void o(t || new a("pipe"))
              );
          };
        })(e, o, n > 0, function (e) {
          (l || (l = e), e && p.forEach(s), o || (p.forEach(s), f(l)));
        });
      });
      return t.reduce(c);
    };
  }),
  i.register("fMrNL", function (t, r) {
    e(t.exports, "default", () => u);
    var n = i("5dZ7N");
    class o {
      get(e) {
        return this.wrapError(
          this.storageArea.get(e).then((e) => e),
          "get",
        );
      }
      set(e) {
        return this.wrapError(this.storageArea.set(e), "set");
      }
      remove(e) {
        return this.wrapError(this.storageArea.remove(e), "remove");
      }
      constructor(e) {
        ((this.areaName = e),
          (this.storageArea = chrome.storage[e]),
          (this.wrapError = (0, n.genWrapError)(`Chrome${e}StorageError`)));
      }
    }
    const a = { local: new o("local"), sync: new o("sync") };
    var u = a;
  }),
  i.register("5dZ7N", function (t, r) {
    (e(t.exports, "genLastErrorFmt", () => n),
      e(t.exports, "genWrapError", () => o),
      e(t.exports, "getLastError", () => i),
      e(t.exports, "isLastError", () => a));
    const n = (e) => (t, r) => {
        const n = { name: e, message: t.message };
        return (r && (n.via = r), n);
      },
      o = (e) => (t, r) =>
        t.catch((t) => {
          const n = new Error(t.message);
          throw ((n.name = e), r && (n.via = r), n);
        }),
      i = () => chrome.runtime.lastError;
    function a(e) {
      if (e && "object" == typeof e) {
        const t = e;
        return (
          "string" == typeof t.name &&
          (null == t.via || "string" == typeof t.via) &&
          "string" == typeof t.message
        );
      }
      return !1;
    }
  }),
  i.register("3ESIc", function (t, r) {
    (e(t.exports, "getVersion", () => n),
      e(t.exports, "compareVersions", () => o));
    const n = () => chrome.runtime.getManifest().version || "0.0",
      o = (e, t) => {
        const r = (e || "").split("."),
          n = (t || "").split("."),
          o = Math.max(r.length, n.length);
        for (let e = 0; e < o; e++) {
          if (r[e] === n[e] || (!r[e] && !n[e])) continue;
          if (!n[e]) return 1;
          if (!r[e]) return -1;
          return parseInt(r[e], 10) > parseInt(n[e], 10) ? 1 : -1;
        }
        return 0;
      };
  }),
  i.register("aiU1O", function (t, r) {
    (e(t.exports, "getReportUrl", () => c),
      e(t.exports, "getReportUrlAsync", () => l),
      e(t.exports, "update", () => f));
    var n = i("h4XuO"),
      o = i("2xkva"),
      a = i("7i7LO"),
      u = i("03QYZ");
    a.default.load().catch((e) => o.default.error(e));
    const s = new Set([
      "url",
      "error",
      "type",
      "opts",
      "userId",
      "subState",
      "metadata",
    ]);
    function c(e) {
      for (const t of Object.keys(e))
        if (!s.has(t)) {
          const r = new Error(`Unexpected report link key: ${t} (${e[t]})`);
          throw ((r.name = "UnexpectedKeyError"), r);
        }
      let {
        url: t,
        error: r,
        type: n,
        metadata: o,
        opts: i,
        userId: c,
        subState: l,
      } = e;
      ((t = t || window.location.href), (i = i || a.default.state));
      let f = r ? (0, u.errorToString)(r) : void 0;
      return (
        n && (f = `[${n}]${f ? " " + f : ""}`),
        (0, u.reportLink)(t, f, i, c, l, o)
      );
    }
    async function l(e) {
      let t;
      try {
        t = await a.default.load();
      } catch (e) {
        (o.default.error(e), (t = { error: (0, u.errorToString)(e) }));
      }
      return c({ ...e, opts: p(t) });
    }
    async function f(e, t) {
      const r = (t && t.metadata) || void 0,
        i = await l({ url: window.location.href, error: e, metadata: r });
      let a = "btn-report",
        u = (0, n.$)(a);
      return (u ? ((u.href = i), n.$.show("btn-report")) : void 0, i);
    }
    const p = (e) => (
      (e = { ...e }),
      Object.entries(a.default.fields).forEach(([t, r]) => {
        if (r.default) {
          const n = "function" == typeof r.default ? r.default() : r.default;
          e[t] === n && delete e[t];
        }
      }),
      e
    );
  }),
  i.register("h4XuO", function (t, r) {
    function n(e) {
      return document.getElementById(e);
    }
    e(t.exports, "$", () => o);
    const o = Object.assign(n, {
      show: function (e, t) {
        const r = n(e);
        ((r.style.display = t && "string" == typeof t ? t : "block"),
          (r.style.visibility = "visible"));
      },
      hide: function (e) {
        n(e).style.display = "none";
      },
      hidden: function (e) {
        n(e).style.visibility = "hidden";
      },
      findClass: function (e, t) {
        return Array.from((t || document).getElementsByClassName(e));
      },
      on: function (e, t, r) {
        return (e.addEventListener(t, r, !1), e);
      },
      once: function (e, t, r) {
        e.addEventListener(
          t,
          function n(o) {
            return (e.removeEventListener(t, n), r.call(this, o));
          },
          !1,
        );
      },
      offsets: function (e) {
        let t = 0,
          r = 0;
        if (e !== window) {
          let n = e;
          for (; n;)
            ((t += n.offsetLeft || 0),
              (r += n.offsetTop || 0),
              (n = n.offsetParent));
        }
        return { left: t, top: r };
      },
      containsElt: function (e, t) {
        for (; t;) {
          if (t === e) return !0;
          t = t.parentNode;
        }
        return !1;
      },
      empty: function (e) {
        for (; e.firstChild;) e.removeChild(e.lastChild);
        return e;
      },
    });
  }),
  i.register("7i7LO", function (t, r) {
    (e(t.exports, "PDF_FORMAT_LETTER", () => g),
      e(t.exports, "PDF_FORMAT_LEGAL", () => v),
      e(t.exports, "PDF_FORMAT_A4", () => m),
      e(t.exports, "PDF_FORMAT_FULL", () => b),
      e(t.exports, "PDF_FORMAT_LETTER_LANDSCAPE", () => w),
      e(t.exports, "PDF_FORMAT_LEGAL_LANDSCAPE", () => E),
      e(t.exports, "PDF_FORMAT_A4_LANDSCAPE", () => _),
      e(t.exports, "default", () => O));
    var n = i("aQWOf"),
      o = i("ecsdh"),
      a = i("2auQc"),
      u = i("1BBN9"),
      s = i("iMjBX"),
      c = i("ebCbw"),
      l = i("dk7YQ"),
      f = i("guJCW");
    const p = c.imageFormatsArray.map((e) => e.key),
      h = (0, s.tr)("Capture"),
      d = (0, s.tr)("PDF"),
      y = (0, s.tr)("Download"),
      g = "letter",
      v = "legal",
      m = "a4",
      b = "full",
      w = "letter-landscape",
      E = "legal-landscape",
      _ = "a4-landscape",
      S = [
        { key: g, display: "US letter portrait" },
        { key: w, display: "US letter landscape" },
        { key: v, display: "US legal portrait" },
        { key: E, display: "US legal landscape" },
        { key: m, display: "A4 portrait" },
        { key: _, display: "A4 landscape" },
        { key: b, display: (0, s.tr)("full image") },
      ],
      A = o.DATE_FORMATS.map((e) => ({ key: e.value, display: e.title }));
    var O = new (0, l.default)("options", {
      fmt: {
        type: "choice",
        group: h,
        choices: p,
        default: "png",
        label: (0, s.tr)("Image format:"),
        help: (0, s.tr)(
          "PNG is lossless and should match exactly what is seen on the screen, but will usually have larger file sizes than JPG, which uses compression.",
        ),
      },
      fixed_elts: {
        type: "bool",
        group: h,
        default: !0,
        label: `${(0, s.tr)("Adjust repeating elements")} (beta)`,
        hidden: !0,
        help: (0, s.tr)(
          "Sometimes elements, like a “back to top” button or a sticky footer will repeat on the page. This tries to position them absolutely to stop them from repeating in a screeshot.",
        ),
      },
      adv_scroll: {
        type: "bool",
        group: h,
        default: !0,
        label: `${(0, s.tr)("Advanced scrolling")} (beta)`,
        hidden: !0,
        help: (0, s.tr)(
          "Look for an element within the page with its own scroll bars and scroll that item during the capture.",
        ),
      },
      pdf_format: {
        type: "choice",
        group: d,
        choices: S,
        default: g,
        label: (0, s.tr)("Paper size:"),
        help: (0, s.tr)(
          "Specify the format size of PDFs for when exporting to PDF.",
        ),
      },
      pdf_smart_page: {
        type: "bool",
        group: d,
        default: !0,
        label: `${(0, s.tr)("Smart page splitting (Premium)")} ⚡️`,
        help: (0, s.tr)(
          "Perform extra checks when splitting a PDF across multiple pages to try to prevent it from cutting lines of text in half. Otherwise, the screenshot is split at the paper size height regardless of its content.",
        ),
        premiumInfo: {
          text: "Prevent lines of text from getting split in half during export-to-PDF with smart page splitting.",
          cta1: "Upgrade your account",
          cta1LinkFn: () => (0, a.makePremiumUrl)(),
          cta2: "login",
          cta2LinkFn: () => (0, a.makeLoginUrl)(),
          basicDefault: !1,
        },
        disabled: !0,
      },
      pdf_url_and_date: {
        type: "bool",
        group: d,
        default: !1,
        label: `${(0, s.tr)("Add URL and date/time (Premium)")} ⚡️`,
        help: (0, s.tr)(
          "Add your screenshot’s URL and capture date/time when exporting to PDF from the main view screenshot page. You can add URL and capture date in the Editor from the “More” menu.",
        ),
        premiumInfo: {
          text: "Enable this feature by signing up for a premium account.",
          cta1: "Upgrade your account",
          cta1LinkFn: () => (0, a.makePremiumUrl)(),
          cta2: "login",
          cta2LinkFn: () => (0, a.makeLoginUrl)(),
          basicDefault: !1,
        },
        disabled: !0,
      },
      pdf_date_fmt: {
        type: "choice",
        group: d,
        choices: A,
        default: o.DATE_FORMAT_DATE,
        label: `${(0, s.tr)("Date format (Premium)")}`,
        help: (e) =>
          `${(0, s.tr)("Display the capture date in this format or hide it entirely.")}${((
            e,
          ) => {
            const t = (0, o.formatDate)(n.DateTime.now(), e);
            return t ? `\n\n${(0, s.tr)("Example:")} ${t}` : "";
          })(e)}`,
        hidden: (e, t) => !(e && t && t.pdf_url_and_date),
      },
      pdf_insert_links: {
        type: "bool",
        group: d,
        default: !1,
        label: `${(0, s.tr)("Active Links (Premium)")} ⚡️ (beta)`,
        help: (0, s.tr)(
          "Activate all the links on the page when downloading as a PDF. Clicking on the link in the PDF will open a page in your browser.\n\n**This is an experimental feature that is still in development—please report any issues to customer support using the “Report issue” flag icon above.**",
        ),
        premiumInfo: {
          text: "Enable this feature by signing up for a premium account.",
          cta1: "Upgrade your account",
          cta1LinkFn: () => (0, a.makePremiumUrl)(),
          cta2: "login",
          cta2LinkFn: () => (0, a.makeLoginUrl)(),
          basicDefault: !1,
        },
        experimental: !0,
        disabled: !0,
      },
      dir: {
        type: "text",
        group: y,
        default: "",
        label: (0, s.tr)("Directory:"),
        help: (0, s.tr)(
          "Specify a directory underneath your downloads directory to save your screenshots, such as “screencaptures”. Defaults to the downloads directory if blank. (Please limit it to letters, numbers, dashes, underscores, and slashes—invalid characters will automatically be removed).",
        ),
        process: (e) => {
          let t = "";
          e = e.trim();
          const r = /^[A-Za-z]:[\/\\]/;
          return (
            (r.test(e) || e.startsWith("../") || e.startsWith("/")) &&
              (t =
                (0, s.tr)(
                  "The browser prevents extensions from saving files outside of the default downloads directory. The path you entered has been updated accordingly. Sorry!",
                ) + " 😟"),
            {
              val: (e = e
                .replace(r, "")
                .replace(/\\/g, "/")
                .replace(/[^a-z0-9\-_\/ ]*/gi, "")
                .replace(/\s+/g, " ")
                .replace(/\/\/+/g, "/")
                .replace(/^\//, "")
                .replace(/\/$/, "")
                .trim()),
              msg: t,
            }
          );
        },
        validate: (e) =>
          f.isString(e).then((t) => t && (!e || u.requestIfNeededDownloads())),
      },
      save_as: {
        type: "bool",
        group: y,
        default: !1,
        label: (0, s.tr)("Save as"),
        help: `${(0, s.tr)("Automatically show a “save as” dialog when downloading your screenshots. If the “Ask where to save each file before downloading” option is enabled in your browser’s settings, then that takes priority.")}${"\n\n" + (0, s.tr)("There are issues with “save as” for auto-download and when downloading multiple files, so it is disabled in those scenarios.")}`,
        validate: (e) => f.isBoolean(e),
      },
      auto_dl2: {
        type: "bool",
        group: y,
        default: !1,
        label: (0, s.tr)("Auto-download files"),
        help: `${(0, s.tr)('Automatically download your screenshot as an image instead of opening it in a new window. This means the extension capture tab will not open. You can return back here by right-clicking on the extension and selecting "Options".')}\n\n${(0, s.tr)("This feature is incompatible with the “Ask where to save each file before downloading” browser setting and can result in errors with the save dialog if that is enabled too.")}`,
        validate: (e) =>
          f
            .isBoolean(e)
            .then((t) => t && (!0 !== e || u.requestIfNeededDownloads())),
      },
      fit_copies: {
        type: "bool",
        group: y,
        default: !0,
        label: (0, s.tr)("Fit copies to Google Docs limits"),
        help: (0, s.tr)(
          "When copying a screenshot to your clipboard, auto-resize it if it exceeds the Google Docs copy-paste limit (25,000,000 pixels). You may still experience issues pasting very large images into other applications, for example Google Docs sometimes truncates the image unless you resize it much smaller.",
        ),
      },
      frame_persist: {
        type: "bool",
        group: h,
        default: !0,
        label: (0, s.tr)("Persist iframe permissions"),
        help: (0, s.tr)(
          "Save this permission (if accepted) for future captures. It can still be revoked later from the options page.",
        ),
        validate: (e) => f.isBoolean(e),
        hidden: !0,
      },
    });
  }),
  i.register("2auQc", function (t, r) {
    (e(t.exports, "makeLoginUrl", () => a),
      e(t.exports, "makePremiumUrl", () => u));
    var n = i("jmw9X"),
      o = i("03QYZ");
    const a = (e) => s(n.LOGIN_URL, e),
      u = (e) => s(n.PREMIUM_URL, e),
      s = (e, t) => {
        t =
          t ||
          window.location.pathname +
            (window.location.search || "") +
            (window.location.hash || "");
        const r =
          chrome.runtime.getURL("/p/index.html") +
          "?" +
          (0, o.toQueryString)([{ key: "p", val: t }]);
        return `${e}?${(0, o.toQueryString)([{ key: "next", val: r }])}`;
      };
  }),
  i.register("03QYZ", function (r, n) {
    (e(r.exports, "GESTURE_TIMEOUT", () => d),
      e(r.exports, "reportLink", () => g),
      e(r.exports, "toQueryString", () => _),
      e(r.exports, "errorToString", () => v),
      e(r.exports, "asFilename", () => m),
      e(r.exports, "asArray", () => b),
      e(r.exports, "getQueryString", () => w),
      e(r.exports, "addViaToError", () => S),
      e(r.exports, "fullServiceDownload", () => A),
      e(r.exports, "scrollEltTo", () => O));
    var o = i("aQWOf"),
      a = i("eygci"),
      u = i("9X70u"),
      s = i("1BBN9"),
      c = i("2xkva"),
      l = i("7i7LO"),
      f = i("35XHW"),
      p = i("3ESIc");
    const h = "https://screencapture.mrcoles.com/",
      d = 5e3,
      y = (e) => {
        var t = !1;
        try {
          ((e = btoa(e)), (t = !0));
        } catch (e) {}
        if (t)
          for (; "=" === e.charAt(e.length - 1);)
            e = e.substring(0, e.length - 1);
        return e;
      },
      g = (e, t, r, n, o, i) => {
        const a = (e) => {
            try {
              return Object.entries(e)
                .map(([e, t]) => `${e}=${t}`)
                .join(";");
            } catch (e) {
              c.default.error("Error parsing obj!", e);
            }
            try {
              return JSON.stringify(e);
            } catch (e) {
              c.default.error("Error JSONifying obj!", e);
            }
            return "" + e;
          },
          u = [{ key: "v", val: y((0, p.getVersion)()) }];
        if (
          (e && u.push({ key: "u", val: y(e) }),
          n && u.push({ key: "i", val: y(n) }),
          o && o !== f.SUB_BAD && u.push({ key: "s", val: y(o) }),
          i)
        ) {
          const e = a(i);
          u.push({ key: "m", val: y(e) });
        }
        if (r) {
          const e = a(r);
          u.push({ key: "o", val: y(e) });
        }
        t && u.push({ key: "e", val: y(t) });
        let s = _(u);
        const l = 1600 - h.length - 1;
        return (
          s.length >= l && (s = s.substring(0, l)),
          h + (s ? "?" + s : "")
        );
      },
      v = (e) => {
        let t;
        return "string" == typeof e
          ? e
          : (e &&
              (t = [e.name, e.via ? `(${e.via})` : "", e.message, e.stack]
                .filter((e) => e)
                .join(" ")),
            t);
      },
      m = (e, r) => {
        try {
          e = decodeURIComponent(e);
        } catch (e) {}
        let n = t(a).remove(e).split("?")[0].split("#")[0];
        n
          ? ((n = n
              .replace(/^https?:\/\/(www\.)?/, "")
              .replace(/^([^\/]+)\.com/, "$1")
              .replace(/[^A-Za-z0-9]+/g, "-")
              .replace(/-+/g, "-")
              .replace(/^[_\-]+/, "")
              .replace(/[_\-]+$/, "")),
            (n = "-" + n))
          : (n = "");
        return `screencapture${n}-${o.DateTime.now().toFormat("yyyy-MM-dd-HH_mm_ss")}${r}`;
      },
      b = (e) => Array.prototype.slice.call(e, 0),
      w = () => E(window.location.search.substring(1)),
      E = (e) => {
        var t = {};
        return (
          (e || "").split("&").forEach(function (e) {
            if (e) {
              var r = e.split("=").map(decodeURIComponent);
              t[r.shift()] = r.join("=");
            }
          }),
          t
        );
      },
      _ = (e) => {
        const t = (e, t) =>
          t
            ? null == e
              ? ""
              : `=${encodeURIComponent(e)}`
            : encodeURIComponent(e);
        return (
          Array.isArray(e)
            ? e.map(({ key: e, val: r }) => t(e) + t(r, !0))
            : Object.entries(e).map(([e, r]) => t(e) + t(r, !0))
        ).join("&");
      },
      S = (e, t) => {
        e.via = (e.via ? `${e.via} > ` : "") + t;
      },
      A = async (e, t = !1, r = !1) => {
        const n = await s.containsDownloads();
        if (n) {
          const o = await l.default.load(),
            i = !(t || e.length > 1) && (r || o.save_as),
            a = await u.downloadAll(e, o.dir, i);
          let s = a.reduce((e, t) => e + (!1 === t.success ? 1 : 0), 0);
          return {
            hasPerms: n,
            results: a,
            failCount: s,
            successCount: a.length - s,
          };
        }
        return {
          hasPerms: n,
          results: e.map((e) => ({ url: e, success: !1 })),
        };
      },
      O = (e, t, r) => {
        e.scrollTo && "function" == typeof e.scrollTo
          ? e.scrollTo(t, r)
          : ((e.scrollLeft = t), (e.scrollTop = r));
      };
  }),
  i.register("eygci", function (e, t) {
    var r = {
        À: "A",
        Á: "A",
        Â: "A",
        Ã: "A",
        Ä: "A",
        Å: "A",
        Ấ: "A",
        Ắ: "A",
        Ẳ: "A",
        Ẵ: "A",
        Ặ: "A",
        Æ: "AE",
        Ầ: "A",
        Ằ: "A",
        Ȃ: "A",
        Ç: "C",
        Ḉ: "C",
        È: "E",
        É: "E",
        Ê: "E",
        Ë: "E",
        Ế: "E",
        Ḗ: "E",
        Ề: "E",
        Ḕ: "E",
        Ḝ: "E",
        Ȇ: "E",
        Ì: "I",
        Í: "I",
        Î: "I",
        Ï: "I",
        Ḯ: "I",
        Ȋ: "I",
        Ð: "D",
        Ñ: "N",
        Ò: "O",
        Ó: "O",
        Ô: "O",
        Õ: "O",
        Ö: "O",
        Ø: "O",
        Ố: "O",
        Ṍ: "O",
        Ṓ: "O",
        Ȏ: "O",
        Ù: "U",
        Ú: "U",
        Û: "U",
        Ü: "U",
        Ý: "Y",
        à: "a",
        á: "a",
        â: "a",
        ã: "a",
        ä: "a",
        å: "a",
        ấ: "a",
        ắ: "a",
        ẳ: "a",
        ẵ: "a",
        ặ: "a",
        æ: "ae",
        ầ: "a",
        ằ: "a",
        ȃ: "a",
        ç: "c",
        ḉ: "c",
        è: "e",
        é: "e",
        ê: "e",
        ë: "e",
        ế: "e",
        ḗ: "e",
        ề: "e",
        ḕ: "e",
        ḝ: "e",
        ȇ: "e",
        ì: "i",
        í: "i",
        î: "i",
        ï: "i",
        ḯ: "i",
        ȋ: "i",
        ð: "d",
        ñ: "n",
        ò: "o",
        ó: "o",
        ô: "o",
        õ: "o",
        ö: "o",
        ø: "o",
        ố: "o",
        ṍ: "o",
        ṓ: "o",
        ȏ: "o",
        ù: "u",
        ú: "u",
        û: "u",
        ü: "u",
        ý: "y",
        ÿ: "y",
        Ā: "A",
        ā: "a",
        Ă: "A",
        ă: "a",
        Ą: "A",
        ą: "a",
        Ć: "C",
        ć: "c",
        Ĉ: "C",
        ĉ: "c",
        Ċ: "C",
        ċ: "c",
        Č: "C",
        č: "c",
        C̆: "C",
        c̆: "c",
        Ď: "D",
        ď: "d",
        Đ: "D",
        đ: "d",
        Ē: "E",
        ē: "e",
        Ĕ: "E",
        ĕ: "e",
        Ė: "E",
        ė: "e",
        Ę: "E",
        ę: "e",
        Ě: "E",
        ě: "e",
        Ĝ: "G",
        Ǵ: "G",
        ĝ: "g",
        ǵ: "g",
        Ğ: "G",
        ğ: "g",
        Ġ: "G",
        ġ: "g",
        Ģ: "G",
        ģ: "g",
        Ĥ: "H",
        ĥ: "h",
        Ħ: "H",
        ħ: "h",
        Ḫ: "H",
        ḫ: "h",
        Ĩ: "I",
        ĩ: "i",
        Ī: "I",
        ī: "i",
        Ĭ: "I",
        ĭ: "i",
        Į: "I",
        į: "i",
        İ: "I",
        ı: "i",
        Ĳ: "IJ",
        ĳ: "ij",
        Ĵ: "J",
        ĵ: "j",
        Ķ: "K",
        ķ: "k",
        Ḱ: "K",
        ḱ: "k",
        K̆: "K",
        k̆: "k",
        Ĺ: "L",
        ĺ: "l",
        Ļ: "L",
        ļ: "l",
        Ľ: "L",
        ľ: "l",
        Ŀ: "L",
        ŀ: "l",
        Ł: "l",
        ł: "l",
        Ḿ: "M",
        ḿ: "m",
        M̆: "M",
        m̆: "m",
        Ń: "N",
        ń: "n",
        Ņ: "N",
        ņ: "n",
        Ň: "N",
        ň: "n",
        ŉ: "n",
        N̆: "N",
        n̆: "n",
        Ō: "O",
        ō: "o",
        Ŏ: "O",
        ŏ: "o",
        Ő: "O",
        ő: "o",
        Œ: "OE",
        œ: "oe",
        P̆: "P",
        p̆: "p",
        Ŕ: "R",
        ŕ: "r",
        Ŗ: "R",
        ŗ: "r",
        Ř: "R",
        ř: "r",
        R̆: "R",
        r̆: "r",
        Ȓ: "R",
        ȓ: "r",
        Ś: "S",
        ś: "s",
        Ŝ: "S",
        ŝ: "s",
        Ş: "S",
        Ș: "S",
        ș: "s",
        ş: "s",
        Š: "S",
        š: "s",
        Ţ: "T",
        ţ: "t",
        ț: "t",
        Ț: "T",
        Ť: "T",
        ť: "t",
        Ŧ: "T",
        ŧ: "t",
        T̆: "T",
        t̆: "t",
        Ũ: "U",
        ũ: "u",
        Ū: "U",
        ū: "u",
        Ŭ: "U",
        ŭ: "u",
        Ů: "U",
        ů: "u",
        Ű: "U",
        ű: "u",
        Ų: "U",
        ų: "u",
        Ȗ: "U",
        ȗ: "u",
        V̆: "V",
        v̆: "v",
        Ŵ: "W",
        ŵ: "w",
        Ẃ: "W",
        ẃ: "w",
        X̆: "X",
        x̆: "x",
        Ŷ: "Y",
        ŷ: "y",
        Ÿ: "Y",
        Y̆: "Y",
        y̆: "y",
        Ź: "Z",
        ź: "z",
        Ż: "Z",
        ż: "z",
        Ž: "Z",
        ž: "z",
        ſ: "s",
        ƒ: "f",
        Ơ: "O",
        ơ: "o",
        Ư: "U",
        ư: "u",
        Ǎ: "A",
        ǎ: "a",
        Ǐ: "I",
        ǐ: "i",
        Ǒ: "O",
        ǒ: "o",
        Ǔ: "U",
        ǔ: "u",
        Ǖ: "U",
        ǖ: "u",
        Ǘ: "U",
        ǘ: "u",
        Ǚ: "U",
        ǚ: "u",
        Ǜ: "U",
        ǜ: "u",
        Ứ: "U",
        ứ: "u",
        Ṹ: "U",
        ṹ: "u",
        Ǻ: "A",
        ǻ: "a",
        Ǽ: "AE",
        ǽ: "ae",
        Ǿ: "O",
        ǿ: "o",
        Þ: "TH",
        þ: "th",
        Ṕ: "P",
        ṕ: "p",
        Ṥ: "S",
        ṥ: "s",
        X́: "X",
        x́: "x",
        Ѓ: "Г",
        ѓ: "г",
        Ќ: "К",
        ќ: "к",
        A̋: "A",
        a̋: "a",
        E̋: "E",
        e̋: "e",
        I̋: "I",
        i̋: "i",
        Ǹ: "N",
        ǹ: "n",
        Ồ: "O",
        ồ: "o",
        Ṑ: "O",
        ṑ: "o",
        Ừ: "U",
        ừ: "u",
        Ẁ: "W",
        ẁ: "w",
        Ỳ: "Y",
        ỳ: "y",
        Ȁ: "A",
        ȁ: "a",
        Ȅ: "E",
        ȅ: "e",
        Ȉ: "I",
        ȉ: "i",
        Ȍ: "O",
        ȍ: "o",
        Ȑ: "R",
        ȑ: "r",
        Ȕ: "U",
        ȕ: "u",
        B̌: "B",
        b̌: "b",
        Č̣: "C",
        č̣: "c",
        Ê̌: "E",
        ê̌: "e",
        F̌: "F",
        f̌: "f",
        Ǧ: "G",
        ǧ: "g",
        Ȟ: "H",
        ȟ: "h",
        J̌: "J",
        ǰ: "j",
        Ǩ: "K",
        ǩ: "k",
        M̌: "M",
        m̌: "m",
        P̌: "P",
        p̌: "p",
        Q̌: "Q",
        q̌: "q",
        Ř̩: "R",
        ř̩: "r",
        Ṧ: "S",
        ṧ: "s",
        V̌: "V",
        v̌: "v",
        W̌: "W",
        w̌: "w",
        X̌: "X",
        x̌: "x",
        Y̌: "Y",
        y̌: "y",
        A̧: "A",
        a̧: "a",
        B̧: "B",
        b̧: "b",
        Ḑ: "D",
        ḑ: "d",
        Ȩ: "E",
        ȩ: "e",
        Ɛ̧: "E",
        ɛ̧: "e",
        Ḩ: "H",
        ḩ: "h",
        I̧: "I",
        i̧: "i",
        Ɨ̧: "I",
        ɨ̧: "i",
        M̧: "M",
        m̧: "m",
        O̧: "O",
        o̧: "o",
        Q̧: "Q",
        q̧: "q",
        U̧: "U",
        u̧: "u",
        X̧: "X",
        x̧: "x",
        Z̧: "Z",
        z̧: "z",
      },
      n = Object.keys(r).join("|"),
      o = new RegExp(n, "g"),
      i = new RegExp(n, ""),
      a = function (e) {
        return e.replace(o, function (e) {
          return r[e];
        });
      };
    ((e.exports = a),
      (e.exports.has = function (e) {
        return !!e.match(i);
      }),
      (e.exports.remove = a));
  }),
  i.register("9X70u", function (t, r) {
    (e(t.exports, "ERROR_INCOGNITO_NETWORK_NAME", () => u),
      e(t.exports, "downloadAll", () => l));
    var n = i("alm1K"),
      o = i("hoPfQ"),
      a = i("5dZ7N");
    const u = "AllowIncognitoNetworkError",
      s = (0, a.genWrapError)("ChromeDownloadsError"),
      c = (e, t, r, n = !1) => {
        const i = { url: e, conflictAction: "uniquify" };
        return (
          (r || t) &&
            ((r = r || e.split("/").pop()),
            t && (r = `${t}/${r}`),
            (i.filename = r)),
          n && (i.saveAs = !0),
          ((e) => s(chrome.downloads.download(e), "download"))(i).then((e) =>
            (0, o.isAllowedIncognitoAccess)()
              .then((t) => {
                if (t)
                  return ((e) => s(chrome.downloads.search(e), "search"))({
                    id: e,
                  }).then((e) => {
                    const t = e[0];
                    if (
                      t &&
                      "interrupted" === t.state &&
                      "NETWORK_FAILED" === t.error
                    ) {
                      const e = new Error(
                        "Download encountered network failed error with allow incognito",
                      );
                      throw ((e.name = u), e);
                    }
                  });
              })
              .then(() => e),
          )
        );
      },
      l = (e, t, r = !1) => {
        const o = e.length;
        let i = 0,
          a = 0,
          u = [];
        const s = e.map((e) => ("string" == typeof e ? { url: e } : e));
        return (0, n.serialMap)(s, (e) =>
          c(e.url, t, e.filename, r)
            .then((t) => {
              ((a += 1), u.push({ url: e, id: t, success: !0 }));
            })
            .catch((t) => {
              ((i += 1), u.push({ url: e, error: t, success: !1 }));
            }),
        ).then(() => {
          if (i && i === o && u.length && !1 === u[0].success) {
            const e = u[0].error;
            throw ((e.message += ` (downloadAll: ${i} of ${o})`), e);
          }
          return u;
        });
      };
  }),
  i.register("hoPfQ", function (t, r) {
    (e(t.exports, "isFileUrl", () => a),
      e(t.exports, "isAllowedFileSchemeAccess", () => u),
      e(t.exports, "isAllowedIncognitoAccess", () => s));
    var n = i("5dZ7N");
    const o = (0, n.genLastErrorFmt)("ChromeExtensionError"),
      a = (e) => {
        if (!e) return !1;
        try {
          return "file:" === new URL(e).protocol;
        } catch (t) {
          throw ((t.message += ` ${typeof e} (${e})`), t);
        }
      },
      u = () =>
        new Promise((e, t) => {
          chrome.extension.isAllowedFileSchemeAccess((r) => {
            const i = (0, n.getLastError)();
            return i ? t(o(i, "isAllowedFileSchemeAccess")) : e(r);
          });
        }),
      s = () =>
        new Promise((e, t) => {
          chrome.extension.isAllowedIncognitoAccess((r) => {
            const i = (0, n.getLastError)();
            return i ? t(o(i, "isAllowedIncognitoAccess")) : e(r);
          });
        });
  }),
  i.register("1BBN9", function (t, r) {
    (e(t.exports, "PERMISSIONS", () => o),
      e(t.exports, "request", () => a),
      e(t.exports, "contains", () => u),
      e(t.exports, "remove", () => s),
      e(t.exports, "requestIfNeededDownloads", () => c),
      e(t.exports, "requestDownloads", () => l),
      e(t.exports, "containsDownloads", () => f));
    const n = (0, i("5dZ7N").genWrapError)("ChromePermissionsError"),
      o = { DOWNLOADS: "downloads" },
      a = (e, t) => n(chrome.permissions.request(h(e, t)), "request"),
      u = (e, t) => n(chrome.permissions.contains(h(e, t)), "contains"),
      s = (e, t) => n(chrome.permissions.remove(h(e, t)), "remove"),
      c = () => {
        return ((e = o.DOWNLOADS), u(e, t).then((r) => !!r || a(e, t)));
        var e, t;
      },
      l = () => a(o.DOWNLOADS),
      f = () => u(o.DOWNLOADS),
      p = (e) => ("string" == typeof e ? [e] : e),
      h = (e, t) =>
        void 0 === t && "object" == typeof e
          ? e
          : { permissions: (e = p(e)), origins: (t = p(t)) };
  }),
  i.register("35XHW", function (t, r) {
    (e(t.exports, "SUB_BAD", () => n),
      e(t.exports, "SUB_NEEDS_UPDATE", () => o),
      e(t.exports, "SUB_OK", () => i),
      e(t.exports, "STATUS_NONE", () => a));
    const n = "sub-none",
      o = "sub-needs-update",
      i = "sub-ok",
      a = "";
  }),
  i.register("ebCbw", function (t, r) {
    (e(t.exports, "default", () => o),
      e(t.exports, "imageFormatsArray", () => i),
      e(t.exports, "getImageFormat", () => a));
    const n = {
      png: {
        key: "png",
        ext: ".png",
        canvas: "image/png",
        jspdf: "PNG",
        capture: { format: "png", quality: 100 },
      },
      jpg: {
        key: "jpg",
        ext: ".jpg",
        canvas: "image/jpeg",
        jspdf: "JPEG",
        capture: { format: "jpeg", quality: 92 },
      },
    };
    var o = n;
    const i = Object.values(n),
      a = (e) => {
        const t = n[(e || "").toLowerCase()];
        if (void 0 === t) {
          const t = new Error(`No format found for: "${e}"`);
          throw ((t.name = "InvalidImageFormatKey"), t);
        }
        return t;
      };
  }),
  i.register("guJCW", function (t, r) {
    (e(t.exports, "PromiseTrue", () => n),
      e(t.exports, "isBoolean", () => i),
      e(t.exports, "isString", () => a));
    const n = () => new Promise((e) => e(!0)),
      o = (e, t) => new Promise((r) => r(typeof e === t)),
      i = (e) => o(e, "boolean"),
      a = (e) => o(e, "string");
  }),
  i.register("8ABn4", function (r, n) {
    e(r.exports, "Capture", () => h);
    var o = i("yZcwP"),
      a = i("6Mjyh"),
      u = i("aQWOf"),
      s = i("mG6c6"),
      c = i("ebCbw"),
      l = i("2xkva"),
      f = i("03QYZ");
    const p = new (0, a.default)("Test4");
    p.version(100).stores({ captures: "++id, domain, time" });
    class h {
      static from(e, t, r, n, o, i, a) {
        ((t = t || ""), (n = n || 1));
        let u = (0, c.getImageFormat)(r);
        (r !== u.key &&
          (l.default.warn(`Wrong case for image format key ${r} vs ${u.key}`),
          (r = u.key)),
          y(Array.isArray(o), "Files object is not an array! " + typeof o));
        let s = {
            url: e,
            domain: g(e),
            title: t,
            format: r,
            scaleMultiplier: n,
            images: o.map((e) => e.filename),
            sizes: o.map((e) => e.size),
            time: a || new Date(),
            metadata: i,
          },
          f = new h();
        return (
          Object.entries(s).forEach(([e, t]) => {
            f[e] = t;
          }),
          f
        );
      }
      get pdfFilename() {
        return this.images.length
          ? this.images[0].replace(/\.[^\.]+$/, ".pdf")
          : "screenshot.pdf";
      }
      get fullPaths() {
        return this.images.map((e) => s.default.absPath(`/${e}`));
      }
      get fileEntryPaths() {
        return this.images.map((e) => `/${e}`);
      }
      get imageFormat() {
        return (0, c.getImageFormat)(this.format);
      }
      get dateTime() {
        return ((v) => {
          if (!v) return u.DateTime.now();
          if (v.isLuxonDateTime) return v;
          if (v instanceof Date) return u.DateTime.fromJSDate(v);
          if (typeof v === "string") {
            let p = u.DateTime.fromISO(v);
            if (p.isValid) return p;
            const d = new Date(v);
            return isNaN(d.getTime())
              ? u.DateTime.now()
              : u.DateTime.fromJSDate(d);
          }
          if (typeof v === "number") return u.DateTime.fromMillis(v);
          return u.DateTime.now();
        })(this.time);
      }
      get displayURL() {
        return (
          chrome.runtime.getURL("/dist/capture.html") +
          "?" +
          (0, f.toQueryString)([
            { key: "id", val: this.id },
            { key: "url", val: this.url },
          ])
        );
      }
      getEditorURL(e = 0) {
        return (
          chrome.runtime.getURL("/dist/editor.html") +
          "?" +
          (0, f.toQueryString)([
            { key: "id", val: this.id },
            { key: "e", val: e },
          ])
        );
      }
      static count() {
        return p.captures.count();
      }
      save() {
        return p.captures.put(this).then((e) => ((this.id = e), this));
      }
      hackUpdateCreated(e) {
        const t = new Date(),
          r = {},
          n = ["created", "updated"];
        return (
          n.forEach((n) => (r[`edits.${e}.${n}`] = t)),
          p.captures.update(this.id, r).then((r) => {
            if (!r) {
              const e = new Error(
                `Capture not found for update scale (${this.id})`,
              );
              throw ((e.name = "UpdateCaptureNotFound"), e);
            }
            return (n.forEach((r) => (this.edits[e][r] = t)), this);
          })
        );
      }
      updateScaleMultiplier() {
        t(o).ok(
          !this.scaleMultiplier,
          `Should not set scaleMultiplier when already have (${this.id}: ${this.scaleMultiplier})`,
        );
        const e = {
          scaleMultiplier: window.devicePixelRatio || 1,
          guessedScale: !0,
        };
        return p.captures.update(this.id, e).then((t) => {
          if (!t) {
            const e = new Error(
              `Capture not found for update scale (${this.id})`,
            );
            throw ((e.name = "UpdateCaptureNotFound"), e);
          }
          return (Object.entries(e).forEach(([e, t]) => (this[e] = t)), this);
        });
      }
      addEdit(e, r = 0) {
        (t(o).number(e, "Capture.addEdit(editId)"),
          t(o).number(r, "Capture.addEdit(..., imageId)"),
          t(o).equal(
            e,
            r,
            `Must make editId (${e}) and imageId (${r}) the same!`,
          ));
        const n = new Date(),
          i = { id: e, imageId: r, created: n, updated: n };
        let a, u;
        return (
          this.edits
            ? (true ||
                t(o).ok(
                  !this.edits[e],
                  `Cannot overwrite existing edit ${e} -> ${JSON.stringify(this.edits[e])}`,
                ),
              (a = `edits.${e}`),
              (u = i))
            : ((a = "edits"), (u = []), (u[e] = i)),
          p.captures.update(this.id, { [a]: u }).then((e) => {
            if (!e) {
              const e = new Error(`Capture not found for add (${this.id})`);
              throw ((e.name = "AddCaptureEditNotFound"), e);
            }
            let t = this;
            return (
              a.split(".").forEach((e, r, n) => {
                ((e = /^\d+$/.test(e) ? parseInt(e) : e),
                  r === n.length - 1 ? (t[e] = u) : (t = this[e]));
              }),
              this
            );
          })
        );
      }
      static updateEditState(e, t, r) {
        return p.captures
          .update(e, {
            [`edits.${t}.undos`]: r,
            [`edits.${t}.updated`]: new Date(),
          })
          .then((t) => {
            if (!t) {
              const t = new Error(`Capture not found for update (${e})`);
              throw ((t.name = "UpdateCaptureEditNotFound"), t);
            }
          });
      }
      remove() {
        return s.default
          .requestFs()
          .then((e) => s.default.getFiles(e, this.fileEntryPaths, !0))
          .then((e) => s.default.rmFiles(e, (e) => (0, l.default)(e)))
          .then(({ succeeded: e, failed: t }) => {
            if (t.length) {
              let e = t.map((e) => e.toURL()),
                r = [],
                n = [];
              (this.fullPaths.forEach((t, o) => {
                -1 !== e.indexOf(t) &&
                  (r.push(this.images[o]), n.push(this.sizes[o]));
              }),
                this.save());
              let o = new Error(`Unable to delete: ${e.join(", ")}`);
              throw ((o.name = "CaptureRemove"), o);
            }
            return p.captures.delete(this.id);
          });
      }
      static lookup(e) {
        return p.captures.get(d(e));
      }
      static lookupIds(e) {
        return (
          (e = e.map((e) => d(e))),
          p.captures.where("id").anyOf(e).toArray()
        );
      }
      static findSrc(e) {
        return p.captures
          .toCollection()
          .filter((t) => ~t.images.indexOf(e))
          .toArray()
          .then((e) => e[0]);
      }
      static all() {
        return p.captures.orderBy("time").toArray();
      }
    }
    p.captures.mapToClass(h);
    const d = (e) =>
        "string" == typeof e && /^\d+$/.test(e) ? parseInt(e, 10) : e,
      y = (e, t, r) => {
        if (!e) {
          void 0 === r && ((r = t), (t = void 0));
          let e = new Error(r);
          throw (t && (e.name = t), e);
        }
      },
      g = (e) => {
        let t = /^https?:\/\//;
        return (t.test(e) && (e = e.replace(t, "")), e.split(":")[0]);
      };
  }),
  i.register("6Mjyh", function (t, n) {
    e(t.exports, "default", () => dn);
    /*! *****************************************************************************
Copyright (c) Microsoft Corporation.
Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.
THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
    var o = function (e, t) {
      return (
        (o =
          Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array &&
            function (e, t) {
              e.__proto__ = t;
            }) ||
          function (e, t) {
            for (var r in t)
              Object.prototype.hasOwnProperty.call(t, r) && (e[r] = t[r]);
          }),
        o(e, t)
      );
    };
    var i = function () {
      return (
        (i =
          Object.assign ||
          function (e) {
            for (var t, r = 1, n = arguments.length; r < n; r++)
              for (var o in (t = arguments[r]))
                Object.prototype.hasOwnProperty.call(t, o) && (e[o] = t[o]);
            return e;
          }),
        i.apply(this, arguments)
      );
    };
    function a(e, t, r) {
      if (r || 2 === arguments.length)
        for (var n, o = 0, i = t.length; o < i; o++)
          (!n && o in t) ||
            (n || (n = Array.prototype.slice.call(t, 0, o)), (n[o] = t[o]));
      return e.concat(n || Array.prototype.slice.call(t));
    }
    var u =
        "undefined" != typeof globalThis
          ? globalThis
          : "undefined" != typeof self
            ? self
            : "undefined" != typeof window
              ? window
              : r,
      s = Object.keys,
      c = Array.isArray;
    function l(e, t) {
      return (
        "object" != typeof t ||
          s(t).forEach(function (r) {
            e[r] = t[r];
          }),
        e
      );
    }
    "undefined" == typeof Promise || u.Promise || (u.Promise = Promise);
    var f = Object.getPrototypeOf,
      p = {}.hasOwnProperty;
    function h(e, t) {
      return p.call(e, t);
    }
    function d(e, t) {
      ("function" == typeof t && (t = t(f(e))),
        ("undefined" == typeof Reflect ? s : Reflect.ownKeys)(t).forEach(
          function (r) {
            g(e, r, t[r]);
          },
        ));
    }
    var y = Object.defineProperty;
    function g(e, t, r, n) {
      y(
        e,
        t,
        l(
          r && h(r, "get") && "function" == typeof r.get
            ? { get: r.get, set: r.set, configurable: !0 }
            : { value: r, configurable: !0, writable: !0 },
          n,
        ),
      );
    }
    function v(e) {
      return {
        from: function (t) {
          return (
            (e.prototype = Object.create(t.prototype)),
            g(e.prototype, "constructor", e),
            { extend: d.bind(null, e.prototype) }
          );
        },
      };
    }
    var m = Object.getOwnPropertyDescriptor;
    function b(e, t) {
      var r;
      return m(e, t) || ((r = f(e)) && b(r, t));
    }
    var w = [].slice;
    function E(e, t, r) {
      return w.call(e, t, r);
    }
    function _(e, t) {
      return t(e);
    }
    function S(e) {
      if (!e) throw new Error("Assertion Failed");
    }
    function A(e) {
      u.setImmediate ? setImmediate(e) : setTimeout(e, 0);
    }
    function O(e, t) {
      if ("string" == typeof t && h(e, t)) return e[t];
      if (!t) return e;
      if ("string" != typeof t) {
        for (var r = [], n = 0, o = t.length; n < o; ++n) {
          var i = O(e, t[n]);
          r.push(i);
        }
        return r;
      }
      var a = t.indexOf(".");
      if (-1 !== a) {
        var u = e[t.substr(0, a)];
        return null == u ? void 0 : O(u, t.substr(a + 1));
      }
    }
    function x(e, t, r) {
      if (e && void 0 !== t && (!("isFrozen" in Object) || !Object.isFrozen(e)))
        if ("string" != typeof t && "length" in t) {
          S("string" != typeof r && "length" in r);
          for (var n = 0, o = t.length; n < o; ++n) x(e, t[n], r[n]);
        } else {
          var i = t.indexOf(".");
          if (-1 !== i) {
            var a = t.substr(0, i),
              u = t.substr(i + 1);
            if ("" === u)
              void 0 === r
                ? c(e) && !isNaN(parseInt(a))
                  ? e.splice(a, 1)
                  : delete e[a]
                : (e[a] = r);
            else {
              var s = e[a];
              ((s && h(e, a)) || (s = e[a] = {}), x(s, u, r));
            }
          } else
            void 0 === r
              ? c(e) && !isNaN(parseInt(t))
                ? e.splice(t, 1)
                : delete e[t]
              : (e[t] = r);
        }
    }
    function k(e) {
      var t = {};
      for (var r in e) h(e, r) && (t[r] = e[r]);
      return t;
    }
    var j = [].concat;
    function P(e) {
      return j.apply([], e);
    }
    var R =
        "BigUint64Array,BigInt64Array,Array,Boolean,String,Date,RegExp,Blob,File,FileList,FileSystemFileHandle,FileSystemDirectoryHandle,ArrayBuffer,DataView,Uint8ClampedArray,ImageBitmap,ImageData,Map,Set,CryptoKey"
          .split(",")
          .concat(
            P(
              [8, 16, 32, 64].map(function (e) {
                return ["Int", "Uint", "Float"].map(function (t) {
                  return t + e + "Array";
                });
              }),
            ),
          )
          .filter(function (e) {
            return u[e];
          }),
      T = new Set(
        R.map(function (e) {
          return u[e];
        }),
      );
    function I(e) {
      var t = {};
      for (var r in e)
        if (h(e, r)) {
          var n = e[r];
          t[r] = !n || "object" != typeof n || T.has(n.constructor) ? n : I(n);
        }
      return t;
    }
    var F = null;
    function D(e) {
      F = new WeakMap();
      var t = C(e);
      return ((F = null), t);
    }
    function C(e) {
      if (!e || "object" != typeof e) return e;
      var t = F.get(e);
      if (t) return t;
      if (c(e)) {
        ((t = []), F.set(e, t));
        for (var r = 0, n = e.length; r < n; ++r) t.push(C(e[r]));
      } else if (T.has(e.constructor)) t = e;
      else {
        var o = f(e);
        for (var i in ((t = o === Object.prototype ? {} : Object.create(o)),
        F.set(e, t),
        e))
          h(e, i) && (t[i] = C(e[i]));
      }
      return t;
    }
    var B = {}.toString;
    function N(e) {
      return B.call(e).slice(8, -1);
    }
    var L = "undefined" != typeof Symbol ? Symbol.iterator : "@@iterator",
      M =
        "symbol" == typeof L
          ? function (e) {
              var t;
              return null != e && (t = e[L]) && t.apply(e);
            }
          : function () {
              return null;
            };
    function U(e, t) {
      var r = e.indexOf(t);
      return (r >= 0 && e.splice(r, 1), r >= 0);
    }
    var q = {};
    function K(e) {
      var t, r, n, o;
      if (1 === arguments.length) {
        if (c(e)) return e.slice();
        if (this === q && "string" == typeof e) return [e];
        if ((o = M(e))) {
          for (r = []; !(n = o.next()).done;) r.push(n.value);
          return r;
        }
        if (null == e) return [e];
        if ("number" == typeof (t = e.length)) {
          for (r = new Array(t); t--;) r[t] = e[t];
          return r;
        }
        return [e];
      }
      for (t = arguments.length, r = new Array(t); t--;) r[t] = arguments[t];
      return r;
    }
    var W =
        "undefined" != typeof Symbol
          ? function (e) {
              return "AsyncFunction" === e[Symbol.toStringTag];
            }
          : function () {
              return !1;
            },
      $ = [
        "Unknown",
        "Constraint",
        "Data",
        "TransactionInactive",
        "ReadOnly",
        "Version",
        "NotFound",
        "InvalidState",
        "InvalidAccess",
        "Abort",
        "Timeout",
        "QuotaExceeded",
        "Syntax",
        "DataClone",
      ],
      G = [
        "Modify",
        "Bulk",
        "OpenFailed",
        "VersionChange",
        "Schema",
        "Upgrade",
        "InvalidTable",
        "MissingAPI",
        "NoSuchDatabase",
        "InvalidArgument",
        "SubTransaction",
        "Unsupported",
        "Internal",
        "DatabaseClosed",
        "PrematureCommit",
        "ForeignAwait",
      ].concat($),
      z = {
        VersionChanged: "Database version changed by other database connection",
        DatabaseClosed: "Database has been closed",
        Abort: "Transaction aborted",
        TransactionInactive: "Transaction has already completed or failed",
        MissingAPI:
          "IndexedDB API missing. Please visit https://tinyurl.com/y2uuvskb",
      };
    function V(e, t) {
      ((this.name = e), (this.message = t));
    }
    function Y(e, t) {
      return (
        e +
        ". Errors: " +
        Object.keys(t)
          .map(function (e) {
            return t[e].toString();
          })
          .filter(function (e, t, r) {
            return r.indexOf(e) === t;
          })
          .join("\n")
      );
    }
    function H(e, t, r, n) {
      ((this.failures = t),
        (this.failedKeys = n),
        (this.successCount = r),
        (this.message = Y(e, t)));
    }
    function X(e, t) {
      ((this.name = "BulkError"),
        (this.failures = Object.keys(t).map(function (e) {
          return t[e];
        })),
        (this.failuresByPos = t),
        (this.message = Y(e, this.failures)));
    }
    (v(V)
      .from(Error)
      .extend({
        toString: function () {
          return this.name + ": " + this.message;
        },
      }),
      v(H).from(V),
      v(X).from(V));
    var J = G.reduce(function (e, t) {
        return ((e[t] = t + "Error"), e);
      }, {}),
      Q = V,
      Z = G.reduce(function (e, t) {
        var r = t + "Error";
        function n(e, n) {
          ((this.name = r),
            e
              ? "string" == typeof e
                ? ((this.message = "".concat(e).concat(n ? "\n " + n : "")),
                  (this.inner = n || null))
                : "object" == typeof e &&
                  ((this.message = "".concat(e.name, " ").concat(e.message)),
                  (this.inner = e))
              : ((this.message = z[t] || r), (this.inner = null)));
        }
        return (v(n).from(Q), (e[t] = n), e);
      }, {});
    ((Z.Syntax = SyntaxError), (Z.Type = TypeError), (Z.Range = RangeError));
    var ee = $.reduce(function (e, t) {
      return ((e[t + "Error"] = Z[t]), e);
    }, {});
    var te = G.reduce(function (e, t) {
      return (
        -1 === ["Syntax", "Type", "Range"].indexOf(t) &&
          (e[t + "Error"] = Z[t]),
        e
      );
    }, {});
    function re() {}
    function ne(e) {
      return e;
    }
    function oe(e, t) {
      return null == e || e === ne
        ? t
        : function (r) {
            return t(e(r));
          };
    }
    function ie(e, t) {
      return function () {
        (e.apply(this, arguments), t.apply(this, arguments));
      };
    }
    function ae(e, t) {
      return e === re
        ? t
        : function () {
            var r = e.apply(this, arguments);
            void 0 !== r && (arguments[0] = r);
            var n = this.onsuccess,
              o = this.onerror;
            ((this.onsuccess = null), (this.onerror = null));
            var i = t.apply(this, arguments);
            return (
              n &&
                (this.onsuccess = this.onsuccess ? ie(n, this.onsuccess) : n),
              o && (this.onerror = this.onerror ? ie(o, this.onerror) : o),
              void 0 !== i ? i : r
            );
          };
    }
    function ue(e, t) {
      return e === re
        ? t
        : function () {
            e.apply(this, arguments);
            var r = this.onsuccess,
              n = this.onerror;
            ((this.onsuccess = this.onerror = null),
              t.apply(this, arguments),
              r &&
                (this.onsuccess = this.onsuccess ? ie(r, this.onsuccess) : r),
              n && (this.onerror = this.onerror ? ie(n, this.onerror) : n));
          };
    }
    function se(e, t) {
      return e === re
        ? t
        : function (r) {
            var n = e.apply(this, arguments);
            l(r, n);
            var o = this.onsuccess,
              i = this.onerror;
            ((this.onsuccess = null), (this.onerror = null));
            var a = t.apply(this, arguments);
            return (
              o &&
                (this.onsuccess = this.onsuccess ? ie(o, this.onsuccess) : o),
              i && (this.onerror = this.onerror ? ie(i, this.onerror) : i),
              void 0 === n ? (void 0 === a ? void 0 : a) : l(n, a)
            );
          };
    }
    function ce(e, t) {
      return e === re
        ? t
        : function () {
            return !1 !== t.apply(this, arguments) && e.apply(this, arguments);
          };
    }
    function le(e, t) {
      return e === re
        ? t
        : function () {
            var r = e.apply(this, arguments);
            if (r && "function" == typeof r.then) {
              for (var n = this, o = arguments.length, i = new Array(o); o--;)
                i[o] = arguments[o];
              return r.then(function () {
                return t.apply(n, i);
              });
            }
            return t.apply(this, arguments);
          };
    }
    ((te.ModifyError = H), (te.DexieError = V), (te.BulkError = X));
    var fe =
      "undefined" != typeof location &&
      /^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);
    function pe(e, t) {
      fe = e;
    }
    var he = {},
      de = 100,
      ye =
        "undefined" == typeof Promise
          ? []
          : (function () {
              var e = Promise.resolve();
              if ("undefined" == typeof crypto || !crypto.subtle)
                return [e, f(e), e];
              var t = crypto.subtle.digest("SHA-512", new Uint8Array([0]));
              return [t, f(t), e];
            })(),
      ge = ye[0],
      ve = ye[1],
      me = ye[2],
      be = ve && ve.then,
      we = ge && ge.constructor,
      Ee = !!me;
    var _e = function (e, t) {
        (Re.push([e, t]), Ae && (queueMicrotask(qe), (Ae = !1)));
      },
      Se = !0,
      Ae = !0,
      Oe = [],
      xe = [],
      ke = ne,
      je = {
        id: "global",
        global: !0,
        ref: 0,
        unhandleds: [],
        onunhandled: re,
        pgp: !1,
        env: {},
        finalize: re,
      },
      Pe = je,
      Re = [],
      Te = 0,
      Ie = [];
    function Fe(e) {
      if ("object" != typeof this)
        throw new TypeError("Promises must be constructed via new");
      ((this._listeners = []), (this._lib = !1));
      var t = (this._PSD = Pe);
      if ("function" != typeof e) {
        if (e !== he) throw new TypeError("Not a function");
        return (
          (this._state = arguments[1]),
          (this._value = arguments[2]),
          void (!1 === this._state && Ne(this, this._value))
        );
      }
      ((this._state = null), (this._value = null), ++t.ref, Be(this, e));
    }
    var De = {
      get: function () {
        var e = Pe,
          t = Je;
        function r(r, n) {
          var o = this,
            i = !e.global && (e !== Pe || t !== Je),
            a = i && !tt(),
            u = new Fe(function (t, u) {
              Me(o, new Ce(st(r, e, i, a), st(n, e, i, a), t, u, e));
            });
          return (this._consoleTask && (u._consoleTask = this._consoleTask), u);
        }
        return ((r.prototype = he), r);
      },
      set: function (e) {
        g(
          this,
          "then",
          e && e.prototype === he
            ? De
            : {
                get: function () {
                  return e;
                },
                set: De.set,
              },
        );
      },
    };
    function Ce(e, t, r, n, o) {
      ((this.onFulfilled = "function" == typeof e ? e : null),
        (this.onRejected = "function" == typeof t ? t : null),
        (this.resolve = r),
        (this.reject = n),
        (this.psd = o));
    }
    function Be(e, t) {
      try {
        t(
          function (t) {
            if (null === e._state) {
              if (t === e)
                throw new TypeError(
                  "A promise cannot be resolved with itself.",
                );
              var r = e._lib && Ke();
              (t && "function" == typeof t.then
                ? Be(e, function (e, r) {
                    t instanceof Fe ? t._then(e, r) : t.then(e, r);
                  })
                : ((e._state = !0), (e._value = t), Le(e)),
                r && We());
            }
          },
          Ne.bind(null, e),
        );
      } catch (t) {
        Ne(e, t);
      }
    }
    function Ne(e, t) {
      if ((xe.push(t), null === e._state)) {
        var r = e._lib && Ke();
        ((t = ke(t)),
          (e._state = !1),
          (e._value = t),
          (function (e) {
            Oe.some(function (t) {
              return t._value === e._value;
            }) || Oe.push(e);
          })(e),
          Le(e),
          r && We());
      }
    }
    function Le(e) {
      var t = e._listeners;
      e._listeners = [];
      for (var r = 0, n = t.length; r < n; ++r) Me(e, t[r]);
      var o = e._PSD;
      (--o.ref || o.finalize(),
        0 === Te &&
          (++Te,
          _e(function () {
            0 == --Te && $e();
          }, [])));
    }
    function Me(e, t) {
      if (null !== e._state) {
        var r = e._state ? t.onFulfilled : t.onRejected;
        if (null === r) return (e._state ? t.resolve : t.reject)(e._value);
        (++t.psd.ref, ++Te, _e(Ue, [r, e, t]));
      } else e._listeners.push(t);
    }
    function Ue(e, t, r) {
      try {
        var n,
          o = t._value;
        (!t._state && xe.length && (xe = []),
          (n =
            fe && t._consoleTask
              ? t._consoleTask.run(function () {
                  return e(o);
                })
              : e(o)),
          t._state ||
            -1 !== xe.indexOf(o) ||
            (function (e) {
              var t = Oe.length;
              for (; t;)
                if (Oe[--t]._value === e._value) return void Oe.splice(t, 1);
            })(t),
          r.resolve(n));
      } catch (e) {
        r.reject(e);
      } finally {
        (0 == --Te && $e(), --r.psd.ref || r.psd.finalize());
      }
    }
    function qe() {
      ut(je, function () {
        Ke() && We();
      });
    }
    function Ke() {
      var e = Se;
      return ((Se = !1), (Ae = !1), e);
    }
    function We() {
      var e, t, r;
      do {
        for (; Re.length > 0;)
          for (e = Re, Re = [], r = e.length, t = 0; t < r; ++t) {
            var n = e[t];
            n[0].apply(null, n[1]);
          }
      } while (Re.length > 0);
      ((Se = !0), (Ae = !0));
    }
    function $e() {
      var e = Oe;
      ((Oe = []),
        e.forEach(function (e) {
          e._PSD.onunhandled.call(null, e._value, e);
        }));
      for (var t = Ie.slice(0), r = t.length; r;) t[--r]();
    }
    function Ge(e) {
      return new Fe(he, !1, e);
    }
    function ze(e, t) {
      var r = Pe;
      return function () {
        var n = Ke(),
          o = Pe;
        try {
          return (it(r, !0), e.apply(this, arguments));
        } catch (e) {
          t && t(e);
        } finally {
          (it(o, !1), n && We());
        }
      };
    }
    (d(Fe.prototype, {
      then: De,
      _then: function (e, t) {
        Me(this, new Ce(null, null, e, t, Pe));
      },
      catch: function (e) {
        if (1 === arguments.length) return this.then(null, e);
        var t = arguments[0],
          r = arguments[1];
        return "function" == typeof t
          ? this.then(null, function (e) {
              return e instanceof t ? r(e) : Ge(e);
            })
          : this.then(null, function (e) {
              return e && e.name === t ? r(e) : Ge(e);
            });
      },
      finally: function (e) {
        return this.then(
          function (t) {
            return Fe.resolve(e()).then(function () {
              return t;
            });
          },
          function (t) {
            return Fe.resolve(e()).then(function () {
              return Ge(t);
            });
          },
        );
      },
      timeout: function (e, t) {
        var r = this;
        return e < 1 / 0
          ? new Fe(function (n, o) {
              var i = setTimeout(function () {
                return o(new Z.Timeout(t));
              }, e);
              r.then(n, o).finally(clearTimeout.bind(null, i));
            })
          : this;
      },
    }),
      "undefined" != typeof Symbol &&
        Symbol.toStringTag &&
        g(Fe.prototype, Symbol.toStringTag, "Dexie.Promise"),
      (je.env = at()),
      d(Fe, {
        all: function () {
          var e = K.apply(null, arguments).map(rt);
          return new Fe(function (t, r) {
            0 === e.length && t([]);
            var n = e.length;
            e.forEach(function (o, i) {
              return Fe.resolve(o).then(function (r) {
                ((e[i] = r), --n || t(e));
              }, r);
            });
          });
        },
        resolve: function (e) {
          return e instanceof Fe
            ? e
            : e && "function" == typeof e.then
              ? new Fe(function (t, r) {
                  e.then(t, r);
                })
              : new Fe(he, !0, e);
        },
        reject: Ge,
        race: function () {
          var e = K.apply(null, arguments).map(rt);
          return new Fe(function (t, r) {
            e.map(function (e) {
              return Fe.resolve(e).then(t, r);
            });
          });
        },
        PSD: {
          get: function () {
            return Pe;
          },
          set: function (e) {
            return (Pe = e);
          },
        },
        totalEchoes: {
          get: function () {
            return Je;
          },
        },
        newPSD: Ze,
        usePSD: ut,
        scheduler: {
          get: function () {
            return _e;
          },
          set: function (e) {
            _e = e;
          },
        },
        rejectionMapper: {
          get: function () {
            return ke;
          },
          set: function (e) {
            ke = e;
          },
        },
        follow: function (e, t) {
          return new Fe(function (r, n) {
            return Ze(
              function (t, r) {
                var n = Pe;
                ((n.unhandleds = []),
                  (n.onunhandled = r),
                  (n.finalize = ie(function () {
                    var e = this;
                    !(function (e) {
                      function t() {
                        (e(), Ie.splice(Ie.indexOf(t), 1));
                      }
                      (Ie.push(t),
                        ++Te,
                        _e(function () {
                          0 == --Te && $e();
                        }, []));
                    })(function () {
                      0 === e.unhandleds.length ? t() : r(e.unhandleds[0]);
                    });
                  }, n.finalize)),
                  e());
              },
              t,
              r,
              n,
            );
          });
        },
      }),
      we &&
        (we.allSettled &&
          g(Fe, "allSettled", function () {
            var e = K.apply(null, arguments).map(rt);
            return new Fe(function (t) {
              0 === e.length && t([]);
              var r = e.length,
                n = new Array(r);
              e.forEach(function (e, o) {
                return Fe.resolve(e)
                  .then(
                    function (e) {
                      return (n[o] = { status: "fulfilled", value: e });
                    },
                    function (e) {
                      return (n[o] = { status: "rejected", reason: e });
                    },
                  )
                  .then(function () {
                    return --r || t(n);
                  });
              });
            });
          }),
        we.any &&
          "undefined" != typeof AggregateError &&
          g(Fe, "any", function () {
            var e = K.apply(null, arguments).map(rt);
            return new Fe(function (t, r) {
              0 === e.length && r(new AggregateError([]));
              var n = e.length,
                o = new Array(n);
              e.forEach(function (e, i) {
                return Fe.resolve(e).then(
                  function (e) {
                    return t(e);
                  },
                  function (e) {
                    ((o[i] = e), --n || r(new AggregateError(o)));
                  },
                );
              });
            });
          }),
        we.withResolvers && (Fe.withResolvers = we.withResolvers)));
    var Ve = { awaits: 0, echoes: 0, id: 0 },
      Ye = 0,
      He = [],
      Xe = 0,
      Je = 0,
      Qe = 0;
    function Ze(e, t, r, n) {
      var o = Pe,
        i = Object.create(o);
      ((i.parent = o),
        (i.ref = 0),
        (i.global = !1),
        (i.id = ++Qe),
        je.env,
        (i.env = Ee
          ? {
              Promise: Fe,
              PromiseProp: { value: Fe, configurable: !0, writable: !0 },
              all: Fe.all,
              race: Fe.race,
              allSettled: Fe.allSettled,
              any: Fe.any,
              resolve: Fe.resolve,
              reject: Fe.reject,
            }
          : {}),
        t && l(i, t),
        ++o.ref,
        (i.finalize = function () {
          --this.parent.ref || this.parent.finalize();
        }));
      var a = ut(i, e, r, n);
      return (0 === i.ref && i.finalize(), a);
    }
    function et() {
      return (Ve.id || (Ve.id = ++Ye), ++Ve.awaits, (Ve.echoes += de), Ve.id);
    }
    function tt() {
      return (
        !!Ve.awaits &&
        (0 == --Ve.awaits && (Ve.id = 0), (Ve.echoes = Ve.awaits * de), !0)
      );
    }
    function rt(e) {
      return Ve.echoes && e && e.constructor === we
        ? (et(),
          e.then(
            function (e) {
              return (tt(), e);
            },
            function (e) {
              return (tt(), lt(e));
            },
          ))
        : e;
    }
    function nt(e) {
      (++Je,
        (Ve.echoes && 0 != --Ve.echoes) || (Ve.echoes = Ve.awaits = Ve.id = 0),
        He.push(Pe),
        it(e, !0));
    }
    function ot() {
      var e = He[He.length - 1];
      (He.pop(), it(e, !1));
    }
    function it(e, t) {
      var r = Pe;
      if (
        ((t ? !Ve.echoes || (Xe++ && e === Pe) : !Xe || (--Xe && e === Pe)) ||
          queueMicrotask(t ? nt.bind(null, e) : ot),
        e !== Pe && ((Pe = e), r === je && (je.env = at()), Ee))
      ) {
        var n = je.env.Promise,
          o = e.env;
        (r.global || e.global) &&
          (Object.defineProperty(u, "Promise", o.PromiseProp),
          (n.all = o.all),
          (n.race = o.race),
          (n.resolve = o.resolve),
          (n.reject = o.reject),
          o.allSettled && (n.allSettled = o.allSettled),
          o.any && (n.any = o.any));
      }
    }
    function at() {
      var e = u.Promise;
      return Ee
        ? {
            Promise: e,
            PromiseProp: Object.getOwnPropertyDescriptor(u, "Promise"),
            all: e.all,
            race: e.race,
            allSettled: e.allSettled,
            any: e.any,
            resolve: e.resolve,
            reject: e.reject,
          }
        : {};
    }
    function ut(e, t, r, n, o) {
      var i = Pe;
      try {
        return (it(e, !0), t(r, n, o));
      } finally {
        it(i, !1);
      }
    }
    function st(e, t, r, n) {
      return "function" != typeof e
        ? e
        : function () {
            var o = Pe;
            (r && et(), it(t, !0));
            try {
              return e.apply(this, arguments);
            } finally {
              (it(o, !1), n && queueMicrotask(tt));
            }
          };
    }
    function ct(e) {
      Promise === we && 0 === Ve.echoes
        ? 0 === Xe
          ? e()
          : enqueueNativeMicroTask(e)
        : setTimeout(e, 0);
    }
    -1 === ("" + be).indexOf("[native code]") && (et = tt = re);
    var lt = Fe.reject;
    function ft(e, t, r, n) {
      if (e.idbdb && (e._state.openComplete || Pe.letThrough || e._vip)) {
        var o = e._createTransaction(t, r, e._dbSchema);
        try {
          (o.create(), (e._state.PR1398_maxLoop = 3));
        } catch (o) {
          return o.name === J.InvalidState &&
            e.isOpen() &&
            --e._state.PR1398_maxLoop > 0
            ? (console.warn("Dexie: Need to reopen db"),
              e.close({ disableAutoOpen: !1 }),
              e.open().then(function () {
                return ft(e, t, r, n);
              }))
            : lt(o);
        }
        return o
          ._promise(t, function (e, t) {
            return Ze(function () {
              return ((Pe.trans = o), n(e, t, o));
            });
          })
          .then(function (e) {
            if ("readwrite" === t)
              try {
                o.idbtrans.commit();
              } catch (e) {}
            return "readonly" === t
              ? e
              : o._completion.then(function () {
                  return e;
                });
          });
      }
      if (e._state.openComplete)
        return lt(new Z.DatabaseClosed(e._state.dbOpenError));
      if (!e._state.isBeingOpened) {
        if (!e._state.autoOpen) return lt(new Z.DatabaseClosed());
        e.open().catch(re);
      }
      return e._state.dbReadyPromise.then(function () {
        return ft(e, t, r, n);
      });
    }
    var pt = "4.0.11",
      ht = String.fromCharCode(65535),
      dt = -1 / 0,
      yt =
        "Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.",
      gt = "String expected.",
      vt = [],
      mt = "__dbnames",
      bt = "readonly",
      wt = "readwrite";
    function Et(e, t) {
      return e
        ? t
          ? function () {
              return e.apply(this, arguments) && t.apply(this, arguments);
            }
          : e
        : t;
    }
    var _t = {
      type: 3,
      lower: -1 / 0,
      lowerOpen: !1,
      upper: [[]],
      upperOpen: !1,
    };
    function St(e) {
      return "string" != typeof e || /\./.test(e)
        ? function (e) {
            return e;
          }
        : function (t) {
            return (void 0 === t[e] && e in t && delete (t = D(t))[e], t);
          };
    }
    function At() {
      throw Z.Type();
    }
    function Ot(e, t) {
      try {
        var r = xt(e),
          n = xt(t);
        if (r !== n)
          return "Array" === r
            ? 1
            : "Array" === n
              ? -1
              : "binary" === r
                ? 1
                : "binary" === n
                  ? -1
                  : "string" === r
                    ? 1
                    : "string" === n
                      ? -1
                      : "Date" === r
                        ? 1
                        : "Date" !== n
                          ? NaN
                          : -1;
        switch (r) {
          case "number":
          case "Date":
          case "string":
            return e > t ? 1 : e < t ? -1 : 0;
          case "binary":
            return (function (e, t) {
              for (
                var r = e.length, n = t.length, o = r < n ? r : n, i = 0;
                i < o;
                ++i
              )
                if (e[i] !== t[i]) return e[i] < t[i] ? -1 : 1;
              return r === n ? 0 : r < n ? -1 : 1;
            })(kt(e), kt(t));
          case "Array":
            return (function (e, t) {
              for (
                var r = e.length, n = t.length, o = r < n ? r : n, i = 0;
                i < o;
                ++i
              ) {
                var a = Ot(e[i], t[i]);
                if (0 !== a) return a;
              }
              return r === n ? 0 : r < n ? -1 : 1;
            })(e, t);
        }
      } catch (e) {}
      return NaN;
    }
    function xt(e) {
      var t = typeof e;
      if ("object" !== t) return t;
      if (ArrayBuffer.isView(e)) return "binary";
      var r = N(e);
      return "ArrayBuffer" === r ? "binary" : r;
    }
    function kt(e) {
      return e instanceof Uint8Array
        ? e
        : ArrayBuffer.isView(e)
          ? new Uint8Array(e.buffer, e.byteOffset, e.byteLength)
          : new Uint8Array(e);
    }
    var jt = (function () {
      function e() {}
      return (
        (e.prototype._trans = function (e, t, r) {
          var n = this._tx || Pe.trans,
            o = this.name,
            i =
              fe &&
              "undefined" != typeof console &&
              console.createTask &&
              console.createTask(
                "Dexie: "
                  .concat("readonly" === e ? "read" : "write", " ")
                  .concat(this.name),
              );
          function a(e, r, n) {
            if (!n.schema[o])
              throw new Z.NotFound("Table " + o + " not part of transaction");
            return t(n.idbtrans, n);
          }
          var u = Ke();
          try {
            var s =
              n && n.db._novip === this.db._novip
                ? n === Pe.trans
                  ? n._promise(e, a, r)
                  : Ze(
                      function () {
                        return n._promise(e, a, r);
                      },
                      { trans: n, transless: Pe.transless || Pe },
                    )
                : ft(this.db, e, [this.name], a);
            return (
              i &&
                ((s._consoleTask = i),
                (s = s.catch(function (e) {
                  return (console.trace(e), lt(e));
                }))),
              s
            );
          } finally {
            u && We();
          }
        }),
        (e.prototype.get = function (e, t) {
          var r = this;
          return e && e.constructor === Object
            ? this.where(e).first(t)
            : null == e
              ? lt(new Z.Type("Invalid argument to Table.get()"))
              : this._trans("readonly", function (t) {
                  return r.core.get({ trans: t, key: e }).then(function (e) {
                    return r.hook.reading.fire(e);
                  });
                }).then(t);
        }),
        (e.prototype.where = function (e) {
          if ("string" == typeof e) return new this.db.WhereClause(this, e);
          if (c(e))
            return new this.db.WhereClause(this, "[".concat(e.join("+"), "]"));
          var t = s(e);
          if (1 === t.length) return this.where(t[0]).equals(e[t[0]]);
          var r = this.schema.indexes
            .concat(this.schema.primKey)
            .filter(function (e) {
              if (
                e.compound &&
                t.every(function (t) {
                  return e.keyPath.indexOf(t) >= 0;
                })
              ) {
                for (var r = 0; r < t.length; ++r)
                  if (-1 === t.indexOf(e.keyPath[r])) return !1;
                return !0;
              }
              return !1;
            })
            .sort(function (e, t) {
              return e.keyPath.length - t.keyPath.length;
            })[0];
          if (r && this.db._maxKey !== ht) {
            var n = r.keyPath.slice(0, t.length);
            return this.where(n).equals(
              n.map(function (t) {
                return e[t];
              }),
            );
          }
          !r &&
            fe &&
            console.warn(
              "The query "
                .concat(JSON.stringify(e), " on ")
                .concat(this.name, " would benefit from a ") +
                "compound index [".concat(t.join("+"), "]"),
            );
          var o = this.schema.idxByName;
          function i(e, t) {
            return 0 === Ot(e, t);
          }
          var a = t.reduce(
              function (t, r) {
                var n = t[0],
                  a = t[1],
                  u = o[r],
                  s = e[r];
                return [
                  n || u,
                  n || !u
                    ? Et(
                        a,
                        u && u.multi
                          ? function (e) {
                              var t = O(e, r);
                              return (
                                c(t) &&
                                t.some(function (e) {
                                  return i(s, e);
                                })
                              );
                            }
                          : function (e) {
                              return i(s, O(e, r));
                            },
                      )
                    : a,
                ];
              },
              [null, null],
            ),
            u = a[0],
            l = a[1];
          return u
            ? this.where(u.name).equals(e[u.keyPath]).filter(l)
            : r
              ? this.filter(l)
              : this.where(t).equals("");
        }),
        (e.prototype.filter = function (e) {
          return this.toCollection().and(e);
        }),
        (e.prototype.count = function (e) {
          return this.toCollection().count(e);
        }),
        (e.prototype.offset = function (e) {
          return this.toCollection().offset(e);
        }),
        (e.prototype.limit = function (e) {
          return this.toCollection().limit(e);
        }),
        (e.prototype.each = function (e) {
          return this.toCollection().each(e);
        }),
        (e.prototype.toArray = function (e) {
          return this.toCollection().toArray(e);
        }),
        (e.prototype.toCollection = function () {
          return new this.db.Collection(new this.db.WhereClause(this));
        }),
        (e.prototype.orderBy = function (e) {
          return new this.db.Collection(
            new this.db.WhereClause(
              this,
              c(e) ? "[".concat(e.join("+"), "]") : e,
            ),
          );
        }),
        (e.prototype.reverse = function () {
          return this.toCollection().reverse();
        }),
        (e.prototype.mapToClass = function (e) {
          var t = this.db,
            r = this.name;
          ((this.schema.mappedClass = e),
            e.prototype instanceof At &&
              (e = (function (e) {
                function n() {
                  return (null !== e && e.apply(this, arguments)) || this;
                }
                return (
                  (function (e, t) {
                    if ("function" != typeof t && null !== t)
                      throw new TypeError(
                        "Class extends value " +
                          String(t) +
                          " is not a constructor or null",
                      );
                    function r() {
                      this.constructor = e;
                    }
                    (o(e, t),
                      (e.prototype =
                        null === t
                          ? Object.create(t)
                          : ((r.prototype = t.prototype), new r())));
                  })(n, e),
                  Object.defineProperty(n.prototype, "db", {
                    get: function () {
                      return t;
                    },
                    enumerable: !1,
                    configurable: !0,
                  }),
                  (n.prototype.table = function () {
                    return r;
                  }),
                  n
                );
              })(e)));
          for (var n = new Set(), i = e.prototype; i; i = f(i))
            Object.getOwnPropertyNames(i).forEach(function (e) {
              return n.add(e);
            });
          var a = function (t) {
            if (!t) return t;
            var r = Object.create(e.prototype);
            for (var o in t)
              if (!n.has(o))
                try {
                  r[o] = t[o];
                } catch (e) {}
            return r;
          };
          return (
            this.schema.readHook &&
              this.hook.reading.unsubscribe(this.schema.readHook),
            (this.schema.readHook = a),
            this.hook("reading", a),
            e
          );
        }),
        (e.prototype.defineClass = function () {
          return this.mapToClass(function (e) {
            l(this, e);
          });
        }),
        (e.prototype.add = function (e, t) {
          var r = this,
            n = this.schema.primKey,
            o = n.auto,
            i = n.keyPath,
            a = e;
          return (
            i && o && (a = St(i)(e)),
            this._trans("readwrite", function (e) {
              return r.core.mutate({
                trans: e,
                type: "add",
                keys: null != t ? [t] : null,
                values: [a],
              });
            })
              .then(function (e) {
                return e.numFailures ? Fe.reject(e.failures[0]) : e.lastResult;
              })
              .then(function (t) {
                if (i)
                  try {
                    x(e, i, t);
                  } catch (e) {}
                return t;
              })
          );
        }),
        (e.prototype.update = function (e, t) {
          if ("object" != typeof e || c(e))
            return this.where(":id").equals(e).modify(t);
          var r = O(e, this.schema.primKey.keyPath);
          return void 0 === r
            ? lt(
                new Z.InvalidArgument(
                  "Given object does not contain its primary key",
                ),
              )
            : this.where(":id").equals(r).modify(t);
        }),
        (e.prototype.put = function (e, t) {
          var r = this,
            n = this.schema.primKey,
            o = n.auto,
            i = n.keyPath,
            a = e;
          return (
            i && o && (a = St(i)(e)),
            this._trans("readwrite", function (e) {
              return r.core.mutate({
                trans: e,
                type: "put",
                values: [a],
                keys: null != t ? [t] : null,
              });
            })
              .then(function (e) {
                return e.numFailures ? Fe.reject(e.failures[0]) : e.lastResult;
              })
              .then(function (t) {
                if (i)
                  try {
                    x(e, i, t);
                  } catch (e) {}
                return t;
              })
          );
        }),
        (e.prototype.delete = function (e) {
          var t = this;
          return this._trans("readwrite", function (r) {
            return t.core.mutate({ trans: r, type: "delete", keys: [e] });
          }).then(function (e) {
            return e.numFailures ? Fe.reject(e.failures[0]) : void 0;
          });
        }),
        (e.prototype.clear = function () {
          var e = this;
          return this._trans("readwrite", function (t) {
            return e.core.mutate({ trans: t, type: "deleteRange", range: _t });
          }).then(function (e) {
            return e.numFailures ? Fe.reject(e.failures[0]) : void 0;
          });
        }),
        (e.prototype.bulkGet = function (e) {
          var t = this;
          return this._trans("readonly", function (r) {
            return t.core.getMany({ keys: e, trans: r }).then(function (e) {
              return e.map(function (e) {
                return t.hook.reading.fire(e);
              });
            });
          });
        }),
        (e.prototype.bulkAdd = function (e, t, r) {
          var n = this,
            o = Array.isArray(t) ? t : void 0,
            i = (r = r || (o ? void 0 : t)) ? r.allKeys : void 0;
          return this._trans("readwrite", function (t) {
            var r = n.schema.primKey,
              a = r.auto,
              u = r.keyPath;
            if (u && o)
              throw new Z.InvalidArgument(
                "bulkAdd(): keys argument invalid on tables with inbound keys",
              );
            if (o && o.length !== e.length)
              throw new Z.InvalidArgument(
                "Arguments objects and keys must have the same length",
              );
            var s = e.length,
              c = u && a ? e.map(St(u)) : e;
            return n.core
              .mutate({
                trans: t,
                type: "add",
                keys: o,
                values: c,
                wantResults: i,
              })
              .then(function (e) {
                var t = e.numFailures,
                  r = e.results,
                  o = e.lastResult,
                  a = e.failures;
                if (0 === t) return i ? r : o;
                throw new X(
                  ""
                    .concat(n.name, ".bulkAdd(): ")
                    .concat(t, " of ")
                    .concat(s, " operations failed"),
                  a,
                );
              });
          });
        }),
        (e.prototype.bulkPut = function (e, t, r) {
          var n = this,
            o = Array.isArray(t) ? t : void 0,
            i = (r = r || (o ? void 0 : t)) ? r.allKeys : void 0;
          return this._trans("readwrite", function (t) {
            var r = n.schema.primKey,
              a = r.auto,
              u = r.keyPath;
            if (u && o)
              throw new Z.InvalidArgument(
                "bulkPut(): keys argument invalid on tables with inbound keys",
              );
            if (o && o.length !== e.length)
              throw new Z.InvalidArgument(
                "Arguments objects and keys must have the same length",
              );
            var s = e.length,
              c = u && a ? e.map(St(u)) : e;
            return n.core
              .mutate({
                trans: t,
                type: "put",
                keys: o,
                values: c,
                wantResults: i,
              })
              .then(function (e) {
                var t = e.numFailures,
                  r = e.results,
                  o = e.lastResult,
                  a = e.failures;
                if (0 === t) return i ? r : o;
                throw new X(
                  ""
                    .concat(n.name, ".bulkPut(): ")
                    .concat(t, " of ")
                    .concat(s, " operations failed"),
                  a,
                );
              });
          });
        }),
        (e.prototype.bulkUpdate = function (e) {
          var t = this,
            r = this.core,
            n = e.map(function (e) {
              return e.key;
            }),
            o = e.map(function (e) {
              return e.changes;
            }),
            i = [];
          return this._trans("readwrite", function (a) {
            return r
              .getMany({ trans: a, keys: n, cache: "clone" })
              .then(function (u) {
                var s = [],
                  c = [];
                e.forEach(function (e, r) {
                  var n = e.key,
                    o = e.changes,
                    a = u[r];
                  if (a) {
                    for (var l = 0, f = Object.keys(o); l < f.length; l++) {
                      var p = f[l],
                        h = o[p];
                      if (p === t.schema.primKey.keyPath) {
                        if (0 !== Ot(h, n))
                          throw new Z.Constraint(
                            "Cannot update primary key in bulkUpdate()",
                          );
                      } else x(a, p, h);
                    }
                    (i.push(r), s.push(n), c.push(a));
                  }
                });
                var l = s.length;
                return r
                  .mutate({
                    trans: a,
                    type: "put",
                    keys: s,
                    values: c,
                    updates: { keys: n, changeSpecs: o },
                  })
                  .then(function (e) {
                    var r = e.numFailures,
                      n = e.failures;
                    if (0 === r) return l;
                    for (var o = 0, a = Object.keys(n); o < a.length; o++) {
                      var u = a[o],
                        s = i[Number(u)];
                      if (null != s) {
                        var c = n[u];
                        (delete n[u], (n[s] = c));
                      }
                    }
                    throw new X(
                      ""
                        .concat(t.name, ".bulkUpdate(): ")
                        .concat(r, " of ")
                        .concat(l, " operations failed"),
                      n,
                    );
                  });
              });
          });
        }),
        (e.prototype.bulkDelete = function (e) {
          var t = this,
            r = e.length;
          return this._trans("readwrite", function (r) {
            return t.core.mutate({ trans: r, type: "delete", keys: e });
          }).then(function (e) {
            var n = e.numFailures,
              o = e.lastResult,
              i = e.failures;
            if (0 === n) return o;
            throw new X(
              ""
                .concat(t.name, ".bulkDelete(): ")
                .concat(n, " of ")
                .concat(r, " operations failed"),
              i,
            );
          });
        }),
        e
      );
    })();
    function Pt(e) {
      var t = {},
        r = function (r, n) {
          if (n) {
            for (var o = arguments.length, i = new Array(o - 1); --o;)
              i[o - 1] = arguments[o];
            return (t[r].subscribe.apply(null, i), e);
          }
          if ("string" == typeof r) return t[r];
        };
      r.addEventType = i;
      for (var n = 1, o = arguments.length; n < o; ++n) i(arguments[n]);
      return r;
      function i(e, n, o) {
        if ("object" != typeof e) {
          var a;
          (n || (n = ce), o || (o = re));
          var u = {
            subscribers: [],
            fire: o,
            subscribe: function (e) {
              -1 === u.subscribers.indexOf(e) &&
                (u.subscribers.push(e), (u.fire = n(u.fire, e)));
            },
            unsubscribe: function (e) {
              ((u.subscribers = u.subscribers.filter(function (t) {
                return t !== e;
              })),
                (u.fire = u.subscribers.reduce(n, o)));
            },
          };
          return ((t[e] = r[e] = u), u);
        }
        s((a = e)).forEach(function (e) {
          var t = a[e];
          if (c(t)) i(e, a[e][0], a[e][1]);
          else {
            if ("asap" !== t)
              throw new Z.InvalidArgument("Invalid event config");
            var r = i(e, ne, function () {
              for (var e = arguments.length, t = new Array(e); e--;)
                t[e] = arguments[e];
              r.subscribers.forEach(function (e) {
                A(function () {
                  e.apply(null, t);
                });
              });
            });
          }
        });
      }
    }
    function Rt(e, t) {
      return (v(t).from({ prototype: e }), t);
    }
    function Tt(e, t) {
      return (
        !(e.filter || e.algorithm || e.or) &&
        (t ? e.justLimit : !e.replayFilter)
      );
    }
    function It(e, t) {
      e.filter = Et(e.filter, t);
    }
    function Ft(e, t, r) {
      var n = e.replayFilter;
      ((e.replayFilter = n
        ? function () {
            return Et(n(), t());
          }
        : t),
        (e.justLimit = r && !n));
    }
    function Dt(e, t) {
      if (e.isPrimKey) return t.primaryKey;
      var r = t.getIndexByKeyPath(e.index);
      if (!r)
        throw new Z.Schema(
          "KeyPath " +
            e.index +
            " on object store " +
            t.name +
            " is not indexed",
        );
      return r;
    }
    function Ct(e, t, r) {
      var n = Dt(e, t.schema);
      return t.openCursor({
        trans: r,
        values: !e.keysOnly,
        reverse: "prev" === e.dir,
        unique: !!e.unique,
        query: { index: n, range: e.range },
      });
    }
    function Bt(e, t, r, n) {
      var o = e.replayFilter ? Et(e.filter, e.replayFilter()) : e.filter;
      if (e.or) {
        var i = {},
          a = function (e, r, n) {
            if (
              !o ||
              o(
                r,
                n,
                function (e) {
                  return r.stop(e);
                },
                function (e) {
                  return r.fail(e);
                },
              )
            ) {
              var a = r.primaryKey,
                u = "" + a;
              ("[object ArrayBuffer]" === u && (u = "" + new Uint8Array(a)),
                h(i, u) || ((i[u] = !0), t(e, r, n)));
            }
          };
        return Promise.all([
          e.or._iterate(a, r),
          Nt(Ct(e, n, r), e.algorithm, a, !e.keysOnly && e.valueMapper),
        ]);
      }
      return Nt(
        Ct(e, n, r),
        Et(e.algorithm, o),
        t,
        !e.keysOnly && e.valueMapper,
      );
    }
    function Nt(e, t, r, n) {
      var o = ze(
        n
          ? function (e, t, o) {
              return r(n(e), t, o);
            }
          : r,
      );
      return e.then(function (e) {
        if (e)
          return e.start(function () {
            var r = function () {
              return e.continue();
            };
            ((t &&
              !t(
                e,
                function (e) {
                  return (r = e);
                },
                function (t) {
                  (e.stop(t), (r = re));
                },
                function (t) {
                  (e.fail(t), (r = re));
                },
              )) ||
              o(e.value, e, function (e) {
                return (r = e);
              }),
              r());
          });
      });
    }
    var Lt = (function () {
        function e(e) {
          this["@@propmod"] = e;
        }
        return (
          (e.prototype.execute = function (e) {
            var t,
              r = this["@@propmod"];
            if (void 0 !== r.add) {
              var n = r.add;
              if (c(n)) return a(a([], c(e) ? e : [], !0), n, !0).sort();
              if ("number" == typeof n) return (Number(e) || 0) + n;
              if ("bigint" == typeof n)
                try {
                  return BigInt(e) + n;
                } catch (e) {
                  return BigInt(0) + n;
                }
              throw new TypeError("Invalid term ".concat(n));
            }
            if (void 0 !== r.remove) {
              var o = r.remove;
              if (c(o))
                return c(e)
                  ? e
                      .filter(function (e) {
                        return !o.includes(e);
                      })
                      .sort()
                  : [];
              if ("number" == typeof o) return Number(e) - o;
              if ("bigint" == typeof o)
                try {
                  return BigInt(e) - o;
                } catch (e) {
                  return BigInt(0) - o;
                }
              throw new TypeError("Invalid subtrahend ".concat(o));
            }
            var i =
              null === (t = r.replacePrefix) || void 0 === t ? void 0 : t[0];
            return i && "string" == typeof e && e.startsWith(i)
              ? r.replacePrefix[1] + e.substring(i.length)
              : e;
          }),
          e
        );
      })(),
      Mt = (function () {
        function e() {}
        return (
          (e.prototype._read = function (e, t) {
            var r = this._ctx;
            return r.error
              ? r.table._trans(null, lt.bind(null, r.error))
              : r.table._trans("readonly", e).then(t);
          }),
          (e.prototype._write = function (e) {
            var t = this._ctx;
            return t.error
              ? t.table._trans(null, lt.bind(null, t.error))
              : t.table._trans("readwrite", e, "locked");
          }),
          (e.prototype._addAlgorithm = function (e) {
            var t = this._ctx;
            t.algorithm = Et(t.algorithm, e);
          }),
          (e.prototype._iterate = function (e, t) {
            return Bt(this._ctx, e, t, this._ctx.table.core);
          }),
          (e.prototype.clone = function (e) {
            var t = Object.create(this.constructor.prototype),
              r = Object.create(this._ctx);
            return (e && l(r, e), (t._ctx = r), t);
          }),
          (e.prototype.raw = function () {
            return ((this._ctx.valueMapper = null), this);
          }),
          (e.prototype.each = function (e) {
            var t = this._ctx;
            return this._read(function (r) {
              return Bt(t, e, r, t.table.core);
            });
          }),
          (e.prototype.count = function (e) {
            var t = this;
            return this._read(function (e) {
              var r = t._ctx,
                n = r.table.core;
              if (Tt(r, !0))
                return n
                  .count({
                    trans: e,
                    query: { index: Dt(r, n.schema), range: r.range },
                  })
                  .then(function (e) {
                    return Math.min(e, r.limit);
                  });
              var o = 0;
              return Bt(
                r,
                function () {
                  return (++o, !1);
                },
                e,
                n,
              ).then(function () {
                return o;
              });
            }).then(e);
          }),
          (e.prototype.sortBy = function (e, t) {
            var r = e.split(".").reverse(),
              n = r[0],
              o = r.length - 1;
            function i(e, t) {
              return t ? i(e[r[t]], t - 1) : e[n];
            }
            var a = "next" === this._ctx.dir ? 1 : -1;
            function u(e, t) {
              return Ot(i(e, o), i(t, o)) * a;
            }
            return this.toArray(function (e) {
              return e.sort(u);
            }).then(t);
          }),
          (e.prototype.toArray = function (e) {
            var t = this;
            return this._read(function (e) {
              var r = t._ctx;
              if ("next" === r.dir && Tt(r, !0) && r.limit > 0) {
                var n = r.valueMapper,
                  o = Dt(r, r.table.core.schema);
                return r.table.core
                  .query({
                    trans: e,
                    limit: r.limit,
                    values: !0,
                    query: { index: o, range: r.range },
                  })
                  .then(function (e) {
                    var t = e.result;
                    return n ? t.map(n) : t;
                  });
              }
              var i = [];
              return Bt(
                r,
                function (e) {
                  return i.push(e);
                },
                e,
                r.table.core,
              ).then(function () {
                return i;
              });
            }, e);
          }),
          (e.prototype.offset = function (e) {
            var t = this._ctx;
            return (
              e <= 0 ||
                ((t.offset += e),
                Tt(t)
                  ? Ft(t, function () {
                      var t = e;
                      return function (e, r) {
                        return (
                          0 === t ||
                          (1 === t
                            ? (--t, !1)
                            : (r(function () {
                                (e.advance(t), (t = 0));
                              }),
                              !1))
                        );
                      };
                    })
                  : Ft(t, function () {
                      var t = e;
                      return function () {
                        return --t < 0;
                      };
                    })),
              this
            );
          }),
          (e.prototype.limit = function (e) {
            return (
              (this._ctx.limit = Math.min(this._ctx.limit, e)),
              Ft(
                this._ctx,
                function () {
                  var t = e;
                  return function (e, r, n) {
                    return (--t <= 0 && r(n), t >= 0);
                  };
                },
                !0,
              ),
              this
            );
          }),
          (e.prototype.until = function (e, t) {
            return (
              It(this._ctx, function (r, n, o) {
                return !e(r.value) || (n(o), t);
              }),
              this
            );
          }),
          (e.prototype.first = function (e) {
            return this.limit(1)
              .toArray(function (e) {
                return e[0];
              })
              .then(e);
          }),
          (e.prototype.last = function (e) {
            return this.reverse().first(e);
          }),
          (e.prototype.filter = function (e) {
            var t, r;
            return (
              It(this._ctx, function (t) {
                return e(t.value);
              }),
              (t = this._ctx),
              (r = e),
              (t.isMatch = Et(t.isMatch, r)),
              this
            );
          }),
          (e.prototype.and = function (e) {
            return this.filter(e);
          }),
          (e.prototype.or = function (e) {
            return new this.db.WhereClause(this._ctx.table, e, this);
          }),
          (e.prototype.reverse = function () {
            return (
              (this._ctx.dir = "prev" === this._ctx.dir ? "next" : "prev"),
              this._ondirectionchange && this._ondirectionchange(this._ctx.dir),
              this
            );
          }),
          (e.prototype.desc = function () {
            return this.reverse();
          }),
          (e.prototype.eachKey = function (e) {
            var t = this._ctx;
            return (
              (t.keysOnly = !t.isMatch),
              this.each(function (t, r) {
                e(r.key, r);
              })
            );
          }),
          (e.prototype.eachUniqueKey = function (e) {
            return ((this._ctx.unique = "unique"), this.eachKey(e));
          }),
          (e.prototype.eachPrimaryKey = function (e) {
            var t = this._ctx;
            return (
              (t.keysOnly = !t.isMatch),
              this.each(function (t, r) {
                e(r.primaryKey, r);
              })
            );
          }),
          (e.prototype.keys = function (e) {
            var t = this._ctx;
            t.keysOnly = !t.isMatch;
            var r = [];
            return this.each(function (e, t) {
              r.push(t.key);
            })
              .then(function () {
                return r;
              })
              .then(e);
          }),
          (e.prototype.primaryKeys = function (e) {
            var t = this._ctx;
            if ("next" === t.dir && Tt(t, !0) && t.limit > 0)
              return this._read(function (e) {
                var r = Dt(t, t.table.core.schema);
                return t.table.core.query({
                  trans: e,
                  values: !1,
                  limit: t.limit,
                  query: { index: r, range: t.range },
                });
              })
                .then(function (e) {
                  return e.result;
                })
                .then(e);
            t.keysOnly = !t.isMatch;
            var r = [];
            return this.each(function (e, t) {
              r.push(t.primaryKey);
            })
              .then(function () {
                return r;
              })
              .then(e);
          }),
          (e.prototype.uniqueKeys = function (e) {
            return ((this._ctx.unique = "unique"), this.keys(e));
          }),
          (e.prototype.firstKey = function (e) {
            return this.limit(1)
              .keys(function (e) {
                return e[0];
              })
              .then(e);
          }),
          (e.prototype.lastKey = function (e) {
            return this.reverse().firstKey(e);
          }),
          (e.prototype.distinct = function () {
            var e = this._ctx,
              t = e.index && e.table.schema.idxByName[e.index];
            if (!t || !t.multi) return this;
            var r = {};
            return (
              It(this._ctx, function (e) {
                var t = e.primaryKey.toString(),
                  n = h(r, t);
                return ((r[t] = !0), !n);
              }),
              this
            );
          }),
          (e.prototype.modify = function (e) {
            var t = this,
              r = this._ctx;
            return this._write(function (n) {
              var o;
              if ("function" == typeof e) o = e;
              else {
                var i = s(e),
                  a = i.length;
                o = function (t) {
                  for (var r = !1, n = 0; n < a; ++n) {
                    var o = i[n],
                      u = e[o],
                      s = O(t, o);
                    u instanceof Lt
                      ? (x(t, o, u.execute(s)), (r = !0))
                      : s !== u && (x(t, o, u), (r = !0));
                  }
                  return r;
                };
              }
              var u = r.table.core,
                c = u.schema.primaryKey,
                l = c.outbound,
                f = c.extractKey,
                p = 200,
                h = t.db._options.modifyChunkSize;
              h && (p = "object" == typeof h ? h[u.name] || h["*"] || 200 : h);
              var d = [],
                y = 0,
                g = [],
                v = function (e, t) {
                  var r = t.failures,
                    n = t.numFailures;
                  y += e - n;
                  for (var o = 0, i = s(r); o < i.length; o++) {
                    var a = i[o];
                    d.push(r[a]);
                  }
                };
              return t
                .clone()
                .primaryKeys()
                .then(function (t) {
                  var i = Tt(r) &&
                      r.limit === 1 / 0 &&
                      ("function" != typeof e || e === Ut) && {
                        index: r.index,
                        range: r.range,
                      },
                    a = function (r) {
                      var s = Math.min(p, t.length - r);
                      return u
                        .getMany({
                          trans: n,
                          keys: t.slice(r, r + s),
                          cache: "immutable",
                        })
                        .then(function (c) {
                          for (
                            var h = [],
                              d = [],
                              y = l ? [] : null,
                              g = [],
                              m = 0;
                            m < s;
                            ++m
                          ) {
                            var b = c[m],
                              w = { value: D(b), primKey: t[r + m] };
                            !1 !== o.call(w, w.value, w) &&
                              (null == w.value
                                ? g.push(t[r + m])
                                : l || 0 === Ot(f(b), f(w.value))
                                  ? (d.push(w.value), l && y.push(t[r + m]))
                                  : (g.push(t[r + m]), h.push(w.value)));
                          }
                          return Promise.resolve(
                            h.length > 0 &&
                              u
                                .mutate({ trans: n, type: "add", values: h })
                                .then(function (e) {
                                  for (var t in e.failures)
                                    g.splice(parseInt(t), 1);
                                  v(h.length, e);
                                }),
                          )
                            .then(function () {
                              return (
                                (d.length > 0 || (i && "object" == typeof e)) &&
                                u
                                  .mutate({
                                    trans: n,
                                    type: "put",
                                    keys: y,
                                    values: d,
                                    criteria: i,
                                    changeSpec: "function" != typeof e && e,
                                    isAdditionalChunk: r > 0,
                                  })
                                  .then(function (e) {
                                    return v(d.length, e);
                                  })
                              );
                            })
                            .then(function () {
                              return (
                                (g.length > 0 || (i && e === Ut)) &&
                                u
                                  .mutate({
                                    trans: n,
                                    type: "delete",
                                    keys: g,
                                    criteria: i,
                                    isAdditionalChunk: r > 0,
                                  })
                                  .then(function (e) {
                                    return v(g.length, e);
                                  })
                              );
                            })
                            .then(function () {
                              return t.length > r + s && a(r + p);
                            });
                        });
                    };
                  return a(0).then(function () {
                    if (d.length > 0)
                      throw new H(
                        "Error modifying one or more objects",
                        d,
                        y,
                        g,
                      );
                    return t.length;
                  });
                });
            });
          }),
          (e.prototype.delete = function () {
            var e = this._ctx,
              t = e.range;
            return Tt(e) && (e.isPrimKey || 3 === t.type)
              ? this._write(function (r) {
                  var n = e.table.core.schema.primaryKey,
                    o = t;
                  return e.table.core
                    .count({ trans: r, query: { index: n, range: o } })
                    .then(function (t) {
                      return e.table.core
                        .mutate({ trans: r, type: "deleteRange", range: o })
                        .then(function (e) {
                          var r = e.failures;
                          (e.lastResult, e.results);
                          var n = e.numFailures;
                          if (n)
                            throw new H(
                              "Could not delete some values",
                              Object.keys(r).map(function (e) {
                                return r[e];
                              }),
                              t - n,
                            );
                          return t - n;
                        });
                    });
                })
              : this.modify(Ut);
          }),
          e
        );
      })(),
      Ut = function (e, t) {
        return (t.value = null);
      };
    function qt(e, t) {
      return e < t ? -1 : e === t ? 0 : 1;
    }
    function Kt(e, t) {
      return e > t ? -1 : e === t ? 0 : 1;
    }
    function Wt(e, t, r) {
      var n = e instanceof Ht ? new e.Collection(e) : e;
      return ((n._ctx.error = r ? new r(t) : new TypeError(t)), n);
    }
    function $t(e) {
      return new e.Collection(e, function () {
        return Yt("");
      }).limit(0);
    }
    function Gt(e, t, r, n, o, i) {
      for (var a = Math.min(e.length, n.length), u = -1, s = 0; s < a; ++s) {
        var c = t[s];
        if (c !== n[s])
          return o(e[s], r[s]) < 0
            ? e.substr(0, s) + r[s] + r.substr(s + 1)
            : o(e[s], n[s]) < 0
              ? e.substr(0, s) + n[s] + r.substr(s + 1)
              : u >= 0
                ? e.substr(0, u) + t[u] + r.substr(u + 1)
                : null;
        o(e[s], c) < 0 && (u = s);
      }
      return a < n.length && "next" === i
        ? e + r.substr(e.length)
        : a < e.length && "prev" === i
          ? e.substr(0, r.length)
          : u < 0
            ? null
            : e.substr(0, u) + n[u] + r.substr(u + 1);
    }
    function zt(e, t, r, n) {
      var o,
        i,
        a,
        u,
        s,
        c,
        l,
        f = r.length;
      if (
        !r.every(function (e) {
          return "string" == typeof e;
        })
      )
        return Wt(e, gt);
      function p(e) {
        ((o = (function (e) {
          return "next" === e
            ? function (e) {
                return e.toUpperCase();
              }
            : function (e) {
                return e.toLowerCase();
              };
        })(e)),
          (i = (function (e) {
            return "next" === e
              ? function (e) {
                  return e.toLowerCase();
                }
              : function (e) {
                  return e.toUpperCase();
                };
          })(e)),
          (a = "next" === e ? qt : Kt));
        var t = r
          .map(function (e) {
            return { lower: i(e), upper: o(e) };
          })
          .sort(function (e, t) {
            return a(e.lower, t.lower);
          });
        ((u = t.map(function (e) {
          return e.upper;
        })),
          (s = t.map(function (e) {
            return e.lower;
          })),
          (c = e),
          (l = "next" === e ? "" : n));
      }
      p("next");
      var h = new e.Collection(e, function () {
        return Vt(u[0], s[f - 1] + n);
      });
      h._ondirectionchange = function (e) {
        p(e);
      };
      var d = 0;
      return (
        h._addAlgorithm(function (e, r, n) {
          var o = e.key;
          if ("string" != typeof o) return !1;
          var p = i(o);
          if (t(p, s, d)) return !0;
          for (var h = null, y = d; y < f; ++y) {
            var g = Gt(o, p, u[y], s[y], a, c);
            null === g && null === h
              ? (d = y + 1)
              : (null === h || a(h, g) > 0) && (h = g);
          }
          return (
            r(
              null !== h
                ? function () {
                    e.continue(h + l);
                  }
                : n,
            ),
            !1
          );
        }),
        h
      );
    }
    function Vt(e, t, r, n) {
      return { type: 2, lower: e, upper: t, lowerOpen: r, upperOpen: n };
    }
    function Yt(e) {
      return { type: 1, lower: e, upper: e };
    }
    var Ht = (function () {
      function e() {}
      return (
        Object.defineProperty(e.prototype, "Collection", {
          get: function () {
            return this._ctx.table.db.Collection;
          },
          enumerable: !1,
          configurable: !0,
        }),
        (e.prototype.between = function (e, t, r, n) {
          ((r = !1 !== r), (n = !0 === n));
          try {
            return this._cmp(e, t) > 0 ||
              (0 === this._cmp(e, t) && (r || n) && (!r || !n))
              ? $t(this)
              : new this.Collection(this, function () {
                  return Vt(e, t, !r, !n);
                });
          } catch (e) {
            return Wt(this, yt);
          }
        }),
        (e.prototype.equals = function (e) {
          return null == e
            ? Wt(this, yt)
            : new this.Collection(this, function () {
                return Yt(e);
              });
        }),
        (e.prototype.above = function (e) {
          return null == e
            ? Wt(this, yt)
            : new this.Collection(this, function () {
                return Vt(e, void 0, !0);
              });
        }),
        (e.prototype.aboveOrEqual = function (e) {
          return null == e
            ? Wt(this, yt)
            : new this.Collection(this, function () {
                return Vt(e, void 0, !1);
              });
        }),
        (e.prototype.below = function (e) {
          return null == e
            ? Wt(this, yt)
            : new this.Collection(this, function () {
                return Vt(void 0, e, !1, !0);
              });
        }),
        (e.prototype.belowOrEqual = function (e) {
          return null == e
            ? Wt(this, yt)
            : new this.Collection(this, function () {
                return Vt(void 0, e);
              });
        }),
        (e.prototype.startsWith = function (e) {
          return "string" != typeof e
            ? Wt(this, gt)
            : this.between(e, e + ht, !0, !0);
        }),
        (e.prototype.startsWithIgnoreCase = function (e) {
          return "" === e
            ? this.startsWith(e)
            : zt(
                this,
                function (e, t) {
                  return 0 === e.indexOf(t[0]);
                },
                [e],
                ht,
              );
        }),
        (e.prototype.equalsIgnoreCase = function (e) {
          return zt(
            this,
            function (e, t) {
              return e === t[0];
            },
            [e],
            "",
          );
        }),
        (e.prototype.anyOfIgnoreCase = function () {
          var e = K.apply(q, arguments);
          return 0 === e.length
            ? $t(this)
            : zt(
                this,
                function (e, t) {
                  return -1 !== t.indexOf(e);
                },
                e,
                "",
              );
        }),
        (e.prototype.startsWithAnyOfIgnoreCase = function () {
          var e = K.apply(q, arguments);
          return 0 === e.length
            ? $t(this)
            : zt(
                this,
                function (e, t) {
                  return t.some(function (t) {
                    return 0 === e.indexOf(t);
                  });
                },
                e,
                ht,
              );
        }),
        (e.prototype.anyOf = function () {
          var e = this,
            t = K.apply(q, arguments),
            r = this._cmp;
          try {
            t.sort(r);
          } catch (e) {
            return Wt(this, yt);
          }
          if (0 === t.length) return $t(this);
          var n = new this.Collection(this, function () {
            return Vt(t[0], t[t.length - 1]);
          });
          n._ondirectionchange = function (n) {
            ((r = "next" === n ? e._ascending : e._descending), t.sort(r));
          };
          var o = 0;
          return (
            n._addAlgorithm(function (e, n, i) {
              for (var a = e.key; r(a, t[o]) > 0;)
                if (++o === t.length) return (n(i), !1);
              return (
                0 === r(a, t[o]) ||
                (n(function () {
                  e.continue(t[o]);
                }),
                !1)
              );
            }),
            n
          );
        }),
        (e.prototype.notEqual = function (e) {
          return this.inAnyRange(
            [
              [dt, e],
              [e, this.db._maxKey],
            ],
            { includeLowers: !1, includeUppers: !1 },
          );
        }),
        (e.prototype.noneOf = function () {
          var e = K.apply(q, arguments);
          if (0 === e.length) return new this.Collection(this);
          try {
            e.sort(this._ascending);
          } catch (e) {
            return Wt(this, yt);
          }
          var t = e.reduce(function (e, t) {
            return e ? e.concat([[e[e.length - 1][1], t]]) : [[dt, t]];
          }, null);
          return (
            t.push([e[e.length - 1], this.db._maxKey]),
            this.inAnyRange(t, { includeLowers: !1, includeUppers: !1 })
          );
        }),
        (e.prototype.inAnyRange = function (e, t) {
          var r = this,
            n = this._cmp,
            o = this._ascending,
            i = this._descending,
            a = this._min,
            u = this._max;
          if (0 === e.length) return $t(this);
          if (
            !e.every(function (e) {
              return void 0 !== e[0] && void 0 !== e[1] && o(e[0], e[1]) <= 0;
            })
          )
            return Wt(
              this,
              "First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower",
              Z.InvalidArgument,
            );
          var s = !t || !1 !== t.includeLowers,
            c = t && !0 === t.includeUppers;
          var l,
            f = o;
          function p(e, t) {
            return f(e[0], t[0]);
          }
          try {
            ((l = e.reduce(function (e, t) {
              for (var r = 0, o = e.length; r < o; ++r) {
                var i = e[r];
                if (n(t[0], i[1]) < 0 && n(t[1], i[0]) > 0) {
                  ((i[0] = a(i[0], t[0])), (i[1] = u(i[1], t[1])));
                  break;
                }
              }
              return (r === o && e.push(t), e);
            }, [])),
              l.sort(p));
          } catch (e) {
            return Wt(this, yt);
          }
          var h = 0,
            d = c
              ? function (e) {
                  return o(e, l[h][1]) > 0;
                }
              : function (e) {
                  return o(e, l[h][1]) >= 0;
                },
            y = s
              ? function (e) {
                  return i(e, l[h][0]) > 0;
                }
              : function (e) {
                  return i(e, l[h][0]) >= 0;
                };
          var g = d,
            v = new this.Collection(this, function () {
              return Vt(l[0][0], l[l.length - 1][1], !s, !c);
            });
          return (
            (v._ondirectionchange = function (e) {
              ("next" === e ? ((g = d), (f = o)) : ((g = y), (f = i)),
                l.sort(p));
            }),
            v._addAlgorithm(function (e, t, n) {
              for (var i = e.key; g(i);)
                if (++h === l.length) return (t(n), !1);
              return (
                !!(function (e) {
                  return !d(e) && !y(e);
                })(i) ||
                (0 === r._cmp(i, l[h][1]) ||
                  0 === r._cmp(i, l[h][0]) ||
                  t(function () {
                    f === o ? e.continue(l[h][0]) : e.continue(l[h][1]);
                  }),
                !1)
              );
            }),
            v
          );
        }),
        (e.prototype.startsWithAnyOf = function () {
          var e = K.apply(q, arguments);
          return e.every(function (e) {
            return "string" == typeof e;
          })
            ? 0 === e.length
              ? $t(this)
              : this.inAnyRange(
                  e.map(function (e) {
                    return [e, e + ht];
                  }),
                )
            : Wt(this, "startsWithAnyOf() only works with strings");
        }),
        e
      );
    })();
    function Xt(e) {
      return ze(function (t) {
        return (Jt(t), e(t.target.error), !1);
      });
    }
    function Jt(e) {
      (e.stopPropagation && e.stopPropagation(),
        e.preventDefault && e.preventDefault());
    }
    var Qt = "storagemutated",
      Zt = "x-storagemutated-1",
      er = Pt(null, Qt),
      tr = (function () {
        function e() {}
        return (
          (e.prototype._lock = function () {
            return (
              S(!Pe.global),
              ++this._reculock,
              1 !== this._reculock || Pe.global || (Pe.lockOwnerFor = this),
              this
            );
          }),
          (e.prototype._unlock = function () {
            if ((S(!Pe.global), 0 == --this._reculock))
              for (
                Pe.global || (Pe.lockOwnerFor = null);
                this._blockedFuncs.length > 0 && !this._locked();
              ) {
                var e = this._blockedFuncs.shift();
                try {
                  ut(e[1], e[0]);
                } catch (e) {}
              }
            return this;
          }),
          (e.prototype._locked = function () {
            return this._reculock && Pe.lockOwnerFor !== this;
          }),
          (e.prototype.create = function (e) {
            var t = this;
            if (!this.mode) return this;
            var r = this.db.idbdb,
              n = this.db._state.dbOpenError;
            if ((S(!this.idbtrans), !e && !r))
              switch (n && n.name) {
                case "DatabaseClosedError":
                  throw new Z.DatabaseClosed(n);
                case "MissingAPIError":
                  throw new Z.MissingAPI(n.message, n);
                default:
                  throw new Z.OpenFailed(n);
              }
            if (!this.active) throw new Z.TransactionInactive();
            return (
              S(null === this._completion._state),
              ((e = this.idbtrans =
                e ||
                (this.db.core
                  ? this.db.core.transaction(this.storeNames, this.mode, {
                      durability: this.chromeTransactionDurability,
                    })
                  : r.transaction(this.storeNames, this.mode, {
                      durability: this.chromeTransactionDurability,
                    }))).onerror = ze(function (r) {
                (Jt(r), t._reject(e.error));
              })),
              (e.onabort = ze(function (r) {
                (Jt(r),
                  t.active && t._reject(new Z.Abort(e.error)),
                  (t.active = !1),
                  t.on("abort").fire(r));
              })),
              (e.oncomplete = ze(function () {
                ((t.active = !1),
                  t._resolve(),
                  "mutatedParts" in e &&
                    er.storagemutated.fire(e.mutatedParts));
              })),
              this
            );
          }),
          (e.prototype._promise = function (e, t, r) {
            var n = this;
            if ("readwrite" === e && "readwrite" !== this.mode)
              return lt(new Z.ReadOnly("Transaction is readonly"));
            if (!this.active) return lt(new Z.TransactionInactive());
            if (this._locked())
              return new Fe(function (o, i) {
                n._blockedFuncs.push([
                  function () {
                    n._promise(e, t, r).then(o, i);
                  },
                  Pe,
                ]);
              });
            if (r)
              return Ze(function () {
                var e = new Fe(function (e, r) {
                  n._lock();
                  var o = t(e, r, n);
                  o && o.then && o.then(e, r);
                });
                return (
                  e.finally(function () {
                    return n._unlock();
                  }),
                  (e._lib = !0),
                  e
                );
              });
            var o = new Fe(function (e, r) {
              var o = t(e, r, n);
              o && o.then && o.then(e, r);
            });
            return ((o._lib = !0), o);
          }),
          (e.prototype._root = function () {
            return this.parent ? this.parent._root() : this;
          }),
          (e.prototype.waitFor = function (e) {
            var t = this._root(),
              r = Fe.resolve(e);
            if (t._waitingFor)
              t._waitingFor = t._waitingFor.then(function () {
                return r;
              });
            else {
              ((t._waitingFor = r), (t._waitingQueue = []));
              var n = t.idbtrans.objectStore(t.storeNames[0]);
              !(function e() {
                for (++t._spinCount; t._waitingQueue.length;)
                  t._waitingQueue.shift()();
                t._waitingFor && (n.get(-1 / 0).onsuccess = e);
              })();
            }
            var o = t._waitingFor;
            return new Fe(function (e, n) {
              r.then(
                function (r) {
                  return t._waitingQueue.push(ze(e.bind(null, r)));
                },
                function (e) {
                  return t._waitingQueue.push(ze(n.bind(null, e)));
                },
              ).finally(function () {
                t._waitingFor === o && (t._waitingFor = null);
              });
            });
          }),
          (e.prototype.abort = function () {
            this.active &&
              ((this.active = !1),
              this.idbtrans && this.idbtrans.abort(),
              this._reject(new Z.Abort()));
          }),
          (e.prototype.table = function (e) {
            var t = this._memoizedTables || (this._memoizedTables = {});
            if (h(t, e)) return t[e];
            var r = this.schema[e];
            if (!r)
              throw new Z.NotFound("Table " + e + " not part of transaction");
            var n = new this.db.Table(e, r, this);
            return ((n.core = this.db.core.table(e)), (t[e] = n), n);
          }),
          e
        );
      })();
    function rr(e, t, r, n, o, i, a) {
      return {
        name: e,
        keyPath: t,
        unique: r,
        multi: n,
        auto: o,
        compound: i,
        src: (r && !a ? "&" : "") + (n ? "*" : "") + (o ? "++" : "") + nr(t),
      };
    }
    function nr(e) {
      return "string" == typeof e
        ? e
        : e
          ? "[" + [].join.call(e, "+") + "]"
          : "";
    }
    function or(e, t, r) {
      return {
        name: e,
        primKey: t,
        indexes: r,
        mappedClass: null,
        idxByName:
          ((n = r),
          (o = function (e) {
            return [e.name, e];
          }),
          n.reduce(function (e, t, r) {
            var n = o(t, r);
            return (n && (e[n[0]] = n[1]), e);
          }, {})),
      };
      var n, o;
    }
    var ir = function (e) {
      try {
        return (
          e.only([[]]),
          (ir = function () {
            return [[]];
          }),
          [[]]
        );
      } catch (e) {
        return (
          (ir = function () {
            return ht;
          }),
          ht
        );
      }
    };
    function ar(e) {
      return null == e
        ? function () {}
        : "string" == typeof e
          ? (function (e) {
              var t = e.split(".");
              return 1 === t.length
                ? function (t) {
                    return t[e];
                  }
                : function (t) {
                    return O(t, e);
                  };
            })(e)
          : function (t) {
              return O(t, e);
            };
    }
    function ur(e) {
      return [].slice.call(e);
    }
    var sr = 0;
    function cr(e) {
      return null == e
        ? ":id"
        : "string" == typeof e
          ? e
          : "[".concat(e.join("+"), "]");
    }
    function lr(e, t, r) {
      function n(e) {
        if (3 === e.type) return null;
        if (4 === e.type)
          throw new Error("Cannot convert never type to IDBKeyRange");
        var r = e.lower,
          n = e.upper,
          o = e.lowerOpen,
          i = e.upperOpen;
        return void 0 === r
          ? void 0 === n
            ? null
            : t.upperBound(n, !!i)
          : void 0 === n
            ? t.lowerBound(r, !!o)
            : t.bound(r, n, !!o, !!i);
      }
      var o = (function (e, t) {
          var r = ur(e.objectStoreNames);
          return {
            schema: {
              name: e.name,
              tables: r
                .map(function (e) {
                  return t.objectStore(e);
                })
                .map(function (e) {
                  var t = e.keyPath,
                    r = e.autoIncrement,
                    n = c(t),
                    o = null == t,
                    i = {},
                    a = {
                      name: e.name,
                      primaryKey: {
                        name: null,
                        isPrimaryKey: !0,
                        outbound: o,
                        compound: n,
                        keyPath: t,
                        autoIncrement: r,
                        unique: !0,
                        extractKey: ar(t),
                      },
                      indexes: ur(e.indexNames)
                        .map(function (t) {
                          return e.index(t);
                        })
                        .map(function (e) {
                          var t = e.name,
                            r = e.unique,
                            n = e.multiEntry,
                            o = e.keyPath,
                            a = {
                              name: t,
                              compound: c(o),
                              keyPath: o,
                              unique: r,
                              multiEntry: n,
                              extractKey: ar(o),
                            };
                          return ((i[cr(o)] = a), a);
                        }),
                      getIndexByKeyPath: function (e) {
                        return i[cr(e)];
                      },
                    };
                  return (
                    (i[":id"] = a.primaryKey),
                    null != t && (i[cr(t)] = a.primaryKey),
                    a
                  );
                }),
            },
            hasGetAll:
              r.length > 0 &&
              "getAll" in t.objectStore(r[0]) &&
              !(
                "undefined" != typeof navigator &&
                /Safari/.test(navigator.userAgent) &&
                !/(Chrome\/|Edge\/)/.test(navigator.userAgent) &&
                [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604
              ),
          };
        })(e, r),
        i = o.schema,
        a = o.hasGetAll,
        u = i.tables.map(function (e) {
          return (function (e) {
            var t = e.name;
            return {
              name: t,
              schema: e,
              mutate: function (e) {
                var r = e.trans,
                  o = e.type,
                  i = e.keys,
                  a = e.values,
                  u = e.range;
                return new Promise(function (e, s) {
                  e = ze(e);
                  var c = r.objectStore(t),
                    l = null == c.keyPath,
                    f = "put" === o || "add" === o;
                  if (!f && "delete" !== o && "deleteRange" !== o)
                    throw new Error("Invalid operation type: " + o);
                  var p,
                    h = (i || a || { length: 1 }).length;
                  if (i && a && i.length !== a.length)
                    throw new Error(
                      "Given keys array must have same length as given values array.",
                    );
                  if (0 === h)
                    return e({
                      numFailures: 0,
                      failures: {},
                      results: [],
                      lastResult: void 0,
                    });
                  var d = [],
                    y = [],
                    g = 0,
                    v = function (e) {
                      (++g, Jt(e));
                    };
                  if ("deleteRange" === o) {
                    if (4 === u.type)
                      return e({
                        numFailures: g,
                        failures: y,
                        results: [],
                        lastResult: void 0,
                      });
                    3 === u.type
                      ? d.push((p = c.clear()))
                      : d.push((p = c.delete(n(u))));
                  } else {
                    var m = f ? (l ? [a, i] : [a, null]) : [i, null],
                      b = m[0],
                      w = m[1];
                    if (f)
                      for (var E = 0; E < h; ++E)
                        (d.push(
                          (p =
                            w && void 0 !== w[E]
                              ? c[o](b[E], w[E])
                              : c[o](b[E])),
                        ),
                          (p.onerror = v));
                    else
                      for (E = 0; E < h; ++E)
                        (d.push((p = c[o](b[E]))), (p.onerror = v));
                  }
                  var _ = function (t) {
                    var r = t.target.result;
                    (d.forEach(function (e, t) {
                      return null != e.error && (y[t] = e.error);
                    }),
                      e({
                        numFailures: g,
                        failures: y,
                        results:
                          "delete" === o
                            ? i
                            : d.map(function (e) {
                                return e.result;
                              }),
                        lastResult: r,
                      }));
                  };
                  ((p.onerror = function (e) {
                    (v(e), _(e));
                  }),
                    (p.onsuccess = _));
                });
              },
              getMany: function (e) {
                var r = e.trans,
                  n = e.keys;
                return new Promise(function (e, o) {
                  e = ze(e);
                  for (
                    var i,
                      a = r.objectStore(t),
                      u = n.length,
                      s = new Array(u),
                      c = 0,
                      l = 0,
                      f = function (t) {
                        var r = t.target;
                        ((s[r._pos] = r.result), ++l === c && e(s));
                      },
                      p = Xt(o),
                      h = 0;
                    h < u;
                    ++h
                  )
                    null != n[h] &&
                      (((i = a.get(n[h]))._pos = h),
                      (i.onsuccess = f),
                      (i.onerror = p),
                      ++c);
                  0 === c && e(s);
                });
              },
              get: function (e) {
                var r = e.trans,
                  n = e.key;
                return new Promise(function (e, o) {
                  e = ze(e);
                  var i = r.objectStore(t).get(n);
                  ((i.onsuccess = function (t) {
                    return e(t.target.result);
                  }),
                    (i.onerror = Xt(o)));
                });
              },
              query: (function (e) {
                return function (r) {
                  return new Promise(function (o, i) {
                    o = ze(o);
                    var a = r.trans,
                      u = r.values,
                      s = r.limit,
                      c = r.query,
                      l = s === 1 / 0 ? void 0 : s,
                      f = c.index,
                      p = c.range,
                      h = a.objectStore(t),
                      d = f.isPrimaryKey ? h : h.index(f.name),
                      y = n(p);
                    if (0 === s) return o({ result: [] });
                    if (e) {
                      var g = u ? d.getAll(y, l) : d.getAllKeys(y, l);
                      ((g.onsuccess = function (e) {
                        return o({ result: e.target.result });
                      }),
                        (g.onerror = Xt(i)));
                    } else {
                      var v = 0,
                        m =
                          u || !("openKeyCursor" in d)
                            ? d.openCursor(y)
                            : d.openKeyCursor(y),
                        b = [];
                      ((m.onsuccess = function (e) {
                        var t = m.result;
                        return t
                          ? (b.push(u ? t.value : t.primaryKey),
                            ++v === s ? o({ result: b }) : void t.continue())
                          : o({ result: b });
                      }),
                        (m.onerror = Xt(i)));
                    }
                  });
                };
              })(a),
              openCursor: function (e) {
                var r = e.trans,
                  o = e.values,
                  i = e.query,
                  a = e.reverse,
                  u = e.unique;
                return new Promise(function (e, s) {
                  e = ze(e);
                  var c = i.index,
                    l = i.range,
                    f = r.objectStore(t),
                    p = c.isPrimaryKey ? f : f.index(c.name),
                    h = a
                      ? u
                        ? "prevunique"
                        : "prev"
                      : u
                        ? "nextunique"
                        : "next",
                    d =
                      o || !("openKeyCursor" in p)
                        ? p.openCursor(n(l), h)
                        : p.openKeyCursor(n(l), h);
                  ((d.onerror = Xt(s)),
                    (d.onsuccess = ze(function (t) {
                      var n = d.result;
                      if (n) {
                        ((n.___id = ++sr), (n.done = !1));
                        var o = n.continue.bind(n),
                          i = n.continuePrimaryKey;
                        i && (i = i.bind(n));
                        var a = n.advance.bind(n),
                          u = function () {
                            throw new Error("Cursor not stopped");
                          };
                        ((n.trans = r),
                          (n.stop =
                            n.continue =
                            n.continuePrimaryKey =
                            n.advance =
                              function () {
                                throw new Error("Cursor not started");
                              }),
                          (n.fail = ze(s)),
                          (n.next = function () {
                            var e = this,
                              t = 1;
                            return this.start(function () {
                              return t-- ? e.continue() : e.stop();
                            }).then(function () {
                              return e;
                            });
                          }),
                          (n.start = function (e) {
                            var t = new Promise(function (e, t) {
                                ((e = ze(e)),
                                  (d.onerror = Xt(t)),
                                  (n.fail = t),
                                  (n.stop = function (t) {
                                    ((n.stop =
                                      n.continue =
                                      n.continuePrimaryKey =
                                      n.advance =
                                        u),
                                      e(t));
                                  }));
                              }),
                              r = function () {
                                if (d.result)
                                  try {
                                    e();
                                  } catch (e) {
                                    n.fail(e);
                                  }
                                else
                                  ((n.done = !0),
                                    (n.start = function () {
                                      throw new Error(
                                        "Cursor behind last entry",
                                      );
                                    }),
                                    n.stop());
                              };
                            return (
                              (d.onsuccess = ze(function (e) {
                                ((d.onsuccess = r), r());
                              })),
                              (n.continue = o),
                              (n.continuePrimaryKey = i),
                              (n.advance = a),
                              r(),
                              t
                            );
                          }),
                          e(n));
                      } else e(null);
                    }, s)));
                });
              },
              count: function (e) {
                var r = e.query,
                  o = e.trans,
                  i = r.index,
                  a = r.range;
                return new Promise(function (e, r) {
                  var u = o.objectStore(t),
                    s = i.isPrimaryKey ? u : u.index(i.name),
                    c = n(a),
                    l = c ? s.count(c) : s.count();
                  ((l.onsuccess = ze(function (t) {
                    return e(t.target.result);
                  })),
                    (l.onerror = Xt(r)));
                });
              },
            };
          })(e);
        }),
        s = {};
      return (
        u.forEach(function (e) {
          return (s[e.name] = e);
        }),
        {
          stack: "dbcore",
          transaction: e.transaction.bind(e),
          table: function (e) {
            if (!s[e]) throw new Error("Table '".concat(e, "' not found"));
            return s[e];
          },
          MIN_KEY: -1 / 0,
          MAX_KEY: ir(t),
          schema: i,
        }
      );
    }
    function fr(e, t, r, n) {
      var o = r.IDBKeyRange;
      r.indexedDB;
      var a = (function (e, t) {
        return t.reduce(function (e, t) {
          var r = t.create;
          return i(i({}, e), r(e));
        }, e);
      })(lr(t, o, n), e.dbcore);
      return { dbcore: a };
    }
    function pr(e, t) {
      var r = t.db,
        n = fr(e._middlewares, r, e._deps, t);
      ((e.core = n.dbcore),
        e.tables.forEach(function (t) {
          var r = t.name;
          e.core.schema.tables.some(function (e) {
            return e.name === r;
          }) &&
            ((t.core = e.core.table(r)),
            e[r] instanceof e.Table && (e[r].core = t.core));
        }));
    }
    function hr(e, t, r, n) {
      r.forEach(function (r) {
        var o = n[r];
        t.forEach(function (t) {
          var n = b(t, r);
          (!n || ("value" in n && void 0 === n.value)) &&
            (t === e.Transaction.prototype || t instanceof e.Transaction
              ? g(t, r, {
                  get: function () {
                    return this.table(r);
                  },
                  set: function (e) {
                    y(this, r, {
                      value: e,
                      writable: !0,
                      configurable: !0,
                      enumerable: !0,
                    });
                  },
                })
              : (t[r] = new e.Table(r, o)));
        });
      });
    }
    function dr(e, t) {
      t.forEach(function (t) {
        for (var r in t) t[r] instanceof e.Table && delete t[r];
      });
    }
    function yr(e, t) {
      return e._cfg.version - t._cfg.version;
    }
    function gr(e, t, r, n) {
      var o = e._dbSchema;
      r.objectStoreNames.contains("$meta") &&
        !o.$meta &&
        ((o.$meta = or("$meta", Sr("")[0], [])), e._storeNames.push("$meta"));
      var i = e._createTransaction("readwrite", e._storeNames, o);
      (i.create(r), i._completion.catch(n));
      var a = i._reject.bind(i),
        u = Pe.transless || Pe;
      Ze(function () {
        if (((Pe.trans = i), (Pe.transless = u), 0 !== t))
          return (
            pr(e, r),
            (function (e, t, r) {
              return t.storeNames.includes("$meta")
                ? t
                    .table("$meta")
                    .get("version")
                    .then(function (e) {
                      return null != e ? e : r;
                    })
                : Fe.resolve(r);
            })(0, i, t)
              .then(function (t) {
                return (function (e, t, r, n) {
                  var o = [],
                    i = e._versions,
                    a = (e._dbSchema = Er(e, e.idbdb, n)),
                    u = i.filter(function (e) {
                      return e._cfg.version >= t;
                    });
                  if (0 === u.length) return Fe.resolve();
                  function c() {
                    return o.length
                      ? Fe.resolve(o.shift()(r.idbtrans)).then(c)
                      : Fe.resolve();
                  }
                  return (
                    u.forEach(function (i) {
                      (o.push(function () {
                        var o = a,
                          u = i._cfg.dbschema;
                        (_r(e, o, n), _r(e, u, n), (a = e._dbSchema = u));
                        var c = vr(o, u);
                        (c.add.forEach(function (e) {
                          mr(n, e[0], e[1].primKey, e[1].indexes);
                        }),
                          c.change.forEach(function (e) {
                            if (e.recreate)
                              throw new Z.Upgrade(
                                "Not yet support for changing primary key",
                              );
                            var t = n.objectStore(e.name);
                            (e.add.forEach(function (e) {
                              return wr(t, e);
                            }),
                              e.change.forEach(function (e) {
                                (t.deleteIndex(e.name), wr(t, e));
                              }),
                              e.del.forEach(function (e) {
                                return t.deleteIndex(e);
                              }));
                          }));
                        var l = i._cfg.contentUpgrade;
                        if (l && i._cfg.version > t) {
                          (pr(e, n), (r._memoizedTables = {}));
                          var f = k(u);
                          (c.del.forEach(function (e) {
                            f[e] = o[e];
                          }),
                            dr(e, [e.Transaction.prototype]),
                            hr(e, [e.Transaction.prototype], s(f), f),
                            (r.schema = f));
                          var p,
                            h = W(l);
                          h && et();
                          var d = Fe.follow(function () {
                            if ((p = l(r)) && h) {
                              var e = tt.bind(null, null);
                              p.then(e, e);
                            }
                          });
                          return p && "function" == typeof p.then
                            ? Fe.resolve(p)
                            : d.then(function () {
                                return p;
                              });
                        }
                      }),
                        o.push(function (t) {
                          (!(function (e, t) {
                            [].slice
                              .call(t.db.objectStoreNames)
                              .forEach(function (r) {
                                return (
                                  null == e[r] && t.db.deleteObjectStore(r)
                                );
                              });
                          })(i._cfg.dbschema, t),
                            dr(e, [e.Transaction.prototype]),
                            hr(
                              e,
                              [e.Transaction.prototype],
                              e._storeNames,
                              e._dbSchema,
                            ),
                            (r.schema = e._dbSchema));
                        }),
                        o.push(function (t) {
                          e.idbdb.objectStoreNames.contains("$meta") &&
                            (Math.ceil(e.idbdb.version / 10) === i._cfg.version
                              ? (e.idbdb.deleteObjectStore("$meta"),
                                delete e._dbSchema.$meta,
                                (e._storeNames = e._storeNames.filter(
                                  function (e) {
                                    return "$meta" !== e;
                                  },
                                )))
                              : t
                                  .objectStore("$meta")
                                  .put(i._cfg.version, "version"));
                        }));
                    }),
                    c().then(function () {
                      br(a, n);
                    })
                  );
                })(e, t, i, r);
              })
              .catch(a)
          );
        (s(o).forEach(function (e) {
          mr(r, e, o[e].primKey, o[e].indexes);
        }),
          pr(e, r),
          Fe.follow(function () {
            return e.on.populate.fire(i);
          }).catch(a));
      });
    }
    function vr(e, t) {
      var r,
        n = { del: [], add: [], change: [] };
      for (r in e) t[r] || n.del.push(r);
      for (r in t) {
        var o = e[r],
          i = t[r];
        if (o) {
          var a = {
            name: r,
            def: i,
            recreate: !1,
            del: [],
            add: [],
            change: [],
          };
          if (
            "" + (o.primKey.keyPath || "") != "" + (i.primKey.keyPath || "") ||
            o.primKey.auto !== i.primKey.auto
          )
            ((a.recreate = !0), n.change.push(a));
          else {
            var u = o.idxByName,
              s = i.idxByName,
              c = void 0;
            for (c in u) s[c] || a.del.push(c);
            for (c in s) {
              var l = u[c],
                f = s[c];
              l ? l.src !== f.src && a.change.push(f) : a.add.push(f);
            }
            (a.del.length > 0 || a.add.length > 0 || a.change.length > 0) &&
              n.change.push(a);
          }
        } else n.add.push([r, i]);
      }
      return n;
    }
    function mr(e, t, r, n) {
      var o = e.db.createObjectStore(
        t,
        r.keyPath
          ? { keyPath: r.keyPath, autoIncrement: r.auto }
          : { autoIncrement: r.auto },
      );
      return (
        n.forEach(function (e) {
          return wr(o, e);
        }),
        o
      );
    }
    function br(e, t) {
      s(e).forEach(function (r) {
        t.db.objectStoreNames.contains(r) ||
          (fe && console.debug("Dexie: Creating missing table", r),
          mr(t, r, e[r].primKey, e[r].indexes));
      });
    }
    function wr(e, t) {
      e.createIndex(t.name, t.keyPath, {
        unique: t.unique,
        multiEntry: t.multi,
      });
    }
    function Er(e, t, r) {
      var n = {};
      return (
        E(t.objectStoreNames, 0).forEach(function (e) {
          for (
            var t = r.objectStore(e),
              o = t.keyPath,
              i = rr(
                nr(o),
                o || "",
                !0,
                !1,
                !!t.autoIncrement,
                o && "string" != typeof o,
                !0,
              ),
              a = [],
              u = 0;
            u < t.indexNames.length;
            ++u
          ) {
            var s = t.index(t.indexNames[u]);
            o = s.keyPath;
            var c = rr(
              s.name,
              o,
              !!s.unique,
              !!s.multiEntry,
              !1,
              o && "string" != typeof o,
              !1,
            );
            a.push(c);
          }
          n[e] = or(e, i, a);
        }),
        n
      );
    }
    function _r(e, t, r) {
      for (var n = r.db.objectStoreNames, o = 0; o < n.length; ++o) {
        var i = n[o],
          a = r.objectStore(i);
        e._hasGetAll = "getAll" in a;
        for (var s = 0; s < a.indexNames.length; ++s) {
          var c = a.indexNames[s],
            l = a.index(c).keyPath,
            f = "string" == typeof l ? l : "[" + E(l).join("+") + "]";
          if (t[i]) {
            var p = t[i].idxByName[f];
            p &&
              ((p.name = c), delete t[i].idxByName[f], (t[i].idxByName[c] = p));
          }
        }
      }
      "undefined" != typeof navigator &&
        /Safari/.test(navigator.userAgent) &&
        !/(Chrome\/|Edge\/)/.test(navigator.userAgent) &&
        u.WorkerGlobalScope &&
        u instanceof u.WorkerGlobalScope &&
        [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604 &&
        (e._hasGetAll = !1);
    }
    function Sr(e) {
      return e.split(",").map(function (e, t) {
        var r = (e = e.trim()).replace(/([&*]|\+\+)/g, ""),
          n = /^\[/.test(r) ? r.match(/^\[(.*)\]$/)[1].split("+") : r;
        return rr(
          r,
          n || null,
          /\&/.test(e),
          /\*/.test(e),
          /\+\+/.test(e),
          c(n),
          0 === t,
        );
      });
    }
    var Ar,
      Or = (function () {
        function e() {}
        return (
          (e.prototype._parseStoresSpec = function (e, t) {
            s(e).forEach(function (r) {
              if (null !== e[r]) {
                var n = Sr(e[r]),
                  o = n.shift();
                if (((o.unique = !0), o.multi))
                  throw new Z.Schema("Primary key cannot be multi-valued");
                (n.forEach(function (e) {
                  if (e.auto)
                    throw new Z.Schema(
                      "Only primary key can be marked as autoIncrement (++)",
                    );
                  if (!e.keyPath)
                    throw new Z.Schema(
                      "Index must have a name and cannot be an empty string",
                    );
                }),
                  (t[r] = or(r, o, n)));
              }
            });
          }),
          (e.prototype.stores = function (e) {
            var t = this.db;
            this._cfg.storesSource = this._cfg.storesSource
              ? l(this._cfg.storesSource, e)
              : e;
            var r = t._versions,
              n = {},
              o = {};
            return (
              r.forEach(function (e) {
                (l(n, e._cfg.storesSource),
                  (o = e._cfg.dbschema = {}),
                  e._parseStoresSpec(n, o));
              }),
              (t._dbSchema = o),
              dr(t, [t._allTables, t, t.Transaction.prototype]),
              hr(
                t,
                [t._allTables, t, t.Transaction.prototype, this._cfg.tables],
                s(o),
                o,
              ),
              (t._storeNames = s(o)),
              this
            );
          }),
          (e.prototype.upgrade = function (e) {
            return (
              (this._cfg.contentUpgrade = le(
                this._cfg.contentUpgrade || re,
                e,
              )),
              this
            );
          }),
          e
        );
      })();
    function xr(e, t) {
      var r = e._dbNamesDB;
      return (
        r ||
          (r = e._dbNamesDB =
            new dn(mt, { addons: [], indexedDB: e, IDBKeyRange: t }))
            .version(100)
            .stores({ dbnames: "name" }),
        r.table("dbnames")
      );
    }
    function kr(e) {
      return e && "function" == typeof e.databases;
    }
    function jr(e) {
      return Ze(function () {
        return ((Pe.letThrough = !0), e());
      });
    }
    function Pr(e) {
      return !("from" in e);
    }
    var Rr = function (e, t) {
      if (!this) {
        var r = new Rr();
        return (e && "d" in e && l(r, e), r);
      }
      l(
        this,
        arguments.length
          ? { d: 1, from: e, to: arguments.length > 1 ? t : e }
          : { d: 0 },
      );
    };
    function Tr(e, t, r) {
      var n = Ot(t, r);
      if (!isNaN(n)) {
        if (n > 0) throw RangeError();
        if (Pr(e)) return l(e, { from: t, to: r, d: 1 });
        var o = e.l,
          i = e.r;
        if (Ot(r, e.from) < 0)
          return (
            o
              ? Tr(o, t, r)
              : (e.l = { from: t, to: r, d: 1, l: null, r: null }),
            Dr(e)
          );
        if (Ot(t, e.to) > 0)
          return (
            i
              ? Tr(i, t, r)
              : (e.r = { from: t, to: r, d: 1, l: null, r: null }),
            Dr(e)
          );
        (Ot(t, e.from) < 0 &&
          ((e.from = t), (e.l = null), (e.d = i ? i.d + 1 : 1)),
          Ot(r, e.to) > 0 &&
            ((e.to = r), (e.r = null), (e.d = e.l ? e.l.d + 1 : 1)));
        var a = !e.r;
        (o && !e.l && Ir(e, o), i && a && Ir(e, i));
      }
    }
    function Ir(e, t) {
      Pr(t) ||
        (function e(t, r) {
          var n = r.from,
            o = r.to,
            i = r.l,
            a = r.r;
          (Tr(t, n, o), i && e(t, i), a && e(t, a));
        })(e, t);
    }
    function Fr(e) {
      var t = Pr(e) ? null : { s: 0, n: e };
      return {
        next: function (e) {
          for (var r = arguments.length > 0; t;)
            switch (t.s) {
              case 0:
                if (((t.s = 1), r))
                  for (; t.n.l && Ot(e, t.n.from) < 0;)
                    t = { up: t, n: t.n.l, s: 1 };
                else for (; t.n.l;) t = { up: t, n: t.n.l, s: 1 };
              case 1:
                if (((t.s = 2), !r || Ot(e, t.n.to) <= 0))
                  return { value: t.n, done: !1 };
              case 2:
                if (t.n.r) {
                  ((t.s = 3), (t = { up: t, n: t.n.r, s: 0 }));
                  continue;
                }
              case 3:
                t = t.up;
            }
          return { done: !0 };
        },
      };
    }
    function Dr(e) {
      var t,
        r,
        n =
          ((null === (t = e.r) || void 0 === t ? void 0 : t.d) || 0) -
          ((null === (r = e.l) || void 0 === r ? void 0 : r.d) || 0),
        o = n > 1 ? "r" : n < -1 ? "l" : "";
      if (o) {
        var a = "r" === o ? "l" : "r",
          u = i({}, e),
          s = e[o];
        ((e.from = s.from),
          (e.to = s.to),
          (e[o] = s[o]),
          (u[o] = s[a]),
          (e[a] = u),
          (u.d = Cr(u)));
      }
      e.d = Cr(e);
    }
    function Cr(e) {
      var t = e.r,
        r = e.l;
      return (t ? (r ? Math.max(t.d, r.d) : t.d) : r ? r.d : 0) + 1;
    }
    function Br(e, t) {
      return (
        s(t).forEach(function (r) {
          e[r] ? Ir(e[r], t[r]) : (e[r] = I(t[r]));
        }),
        e
      );
    }
    function Nr(e, t) {
      return (
        e.all ||
        t.all ||
        Object.keys(e).some(function (r) {
          return (
            t[r] &&
            (function (e, t) {
              var r = Fr(t),
                n = r.next();
              if (n.done) return !1;
              for (
                var o = n.value, i = Fr(e), a = i.next(o.from), u = a.value;
                !n.done && !a.done;
              ) {
                if (Ot(u.from, o.to) <= 0 && Ot(u.to, o.from) >= 0) return !0;
                Ot(o.from, u.from) < 0
                  ? (o = (n = r.next(u.from)).value)
                  : (u = (a = i.next(o.from)).value);
              }
              return !1;
            })(t[r], e[r])
          );
        })
      );
    }
    d(
      Rr.prototype,
      (((Ar = {
        add: function (e) {
          return (Ir(this, e), this);
        },
        addKey: function (e) {
          return (Tr(this, e, e), this);
        },
        addKeys: function (e) {
          var t = this;
          return (
            e.forEach(function (e) {
              return Tr(t, e, e);
            }),
            this
          );
        },
        hasKey: function (e) {
          var t = Fr(this).next(e).value;
          return t && Ot(t.from, e) <= 0 && Ot(t.to, e) >= 0;
        },
      })[L] = function () {
        return Fr(this);
      }),
      Ar),
    );
    var Lr = {},
      Mr = {},
      Ur = !1;
    function qr(e, t) {
      (Br(Mr, e),
        Ur ||
          ((Ur = !0),
          setTimeout(function () {
            Ur = !1;
            var e = Mr;
            ((Mr = {}), Kr(e, !1));
          }, 0)));
    }
    function Kr(e, t) {
      void 0 === t && (t = !1);
      var r = new Set();
      if (e.all)
        for (var n = 0, o = Object.values(Lr); n < o.length; n++) {
          Wr((u = o[n]), e, r, t);
        }
      else
        for (var i in e) {
          var a = /^idb\:\/\/(.*)\/(.*)\//.exec(i);
          if (a) {
            var u,
              s = a[1],
              c = a[2];
            (u = Lr["idb://".concat(s, "/").concat(c)]) && Wr(u, e, r, t);
          }
        }
      r.forEach(function (e) {
        return e();
      });
    }
    function Wr(e, t, r, n) {
      for (
        var o = [], i = 0, a = Object.entries(e.queries.query);
        i < a.length;
        i++
      ) {
        for (
          var u = a[i], s = u[0], c = [], l = 0, f = u[1];
          l < f.length;
          l++
        ) {
          var p = f[l];
          Nr(t, p.obsSet)
            ? p.subscribers.forEach(function (e) {
                return r.add(e);
              })
            : n && c.push(p);
        }
        n && o.push([s, c]);
      }
      if (n)
        for (var h = 0, d = o; h < d.length; h++) {
          var y = d[h];
          ((s = y[0]), (c = y[1]));
          e.queries.query[s] = c;
        }
    }
    function $r(e) {
      var t = e._state,
        r = e._deps.indexedDB;
      if (t.isBeingOpened || e.idbdb)
        return t.dbReadyPromise.then(function () {
          return t.dbOpenError ? lt(t.dbOpenError) : e;
        });
      ((t.isBeingOpened = !0), (t.dbOpenError = null), (t.openComplete = !1));
      var n = t.openCanceller,
        o = Math.round(10 * e.verno),
        i = !1;
      function a() {
        if (t.openCanceller !== n)
          throw new Z.DatabaseClosed("db.open() was cancelled");
      }
      var u,
        c = t.dbReadyResolve,
        l = null,
        f = !1,
        p = function () {
          return new Fe(function (n, u) {
            if ((a(), !r)) throw new Z.MissingAPI();
            var c = e.name,
              h = t.autoSchema || !o ? r.open(c) : r.open(c, o);
            if (!h) throw new Z.MissingAPI();
            ((h.onerror = Xt(u)),
              (h.onblocked = ze(e._fireOnBlocked)),
              (h.onupgradeneeded = ze(function (n) {
                if (
                  ((l = h.transaction),
                  t.autoSchema && !e._options.allowEmptyDB)
                ) {
                  ((h.onerror = Jt), l.abort(), h.result.close());
                  var o = r.deleteDatabase(c);
                  o.onsuccess = o.onerror = ze(function () {
                    u(
                      new Z.NoSuchDatabase(
                        "Database ".concat(c, " doesnt exist"),
                      ),
                    );
                  });
                } else {
                  l.onerror = Xt(u);
                  var a = n.oldVersion > Math.pow(2, 62) ? 0 : n.oldVersion;
                  ((f = a < 1),
                    (e.idbdb = h.result),
                    i &&
                      (function (e, t) {
                        (br(e._dbSchema, t),
                          t.db.version % 10 != 0 ||
                            t.objectStoreNames.contains("$meta") ||
                            t.db
                              .createObjectStore("$meta")
                              .add(
                                Math.ceil(t.db.version / 10 - 1),
                                "version",
                              ));
                        var r = Er(0, e.idbdb, t);
                        _r(e, e._dbSchema, t);
                        for (
                          var n = function (e) {
                              if (e.change.length || e.recreate)
                                return (
                                  console.warn(
                                    "Unable to patch indexes of table ".concat(
                                      e.name,
                                      " because it has changes on the type of index or primary key.",
                                    ),
                                  ),
                                  { value: void 0 }
                                );
                              var r = t.objectStore(e.name);
                              e.add.forEach(function (t) {
                                (fe &&
                                  console.debug(
                                    "Dexie upgrade patch: Creating missing index "
                                      .concat(e.name, ".")
                                      .concat(t.src),
                                  ),
                                  wr(r, t));
                              });
                            },
                            o = 0,
                            i = vr(r, e._dbSchema).change;
                          o < i.length;
                          o++
                        ) {
                          var a = n(i[o]);
                          if ("object" == typeof a) return a.value;
                        }
                      })(e, l),
                    gr(e, a / 10, l, u));
                }
              }, u)),
              (h.onsuccess = ze(function () {
                l = null;
                var r,
                  a = (e.idbdb = h.result),
                  u = E(a.objectStoreNames);
                if (u.length > 0)
                  try {
                    var d = a.transaction(
                      1 === (r = u).length ? r[0] : r,
                      "readonly",
                    );
                    if (t.autoSchema)
                      !(function (e, t, r) {
                        e.verno = t.version / 10;
                        var n = (e._dbSchema = Er(0, t, r));
                        ((e._storeNames = E(t.objectStoreNames, 0)),
                          hr(e, [e._allTables], s(n), n));
                      })(e, a, d);
                    else if (
                      (_r(e, e._dbSchema, d),
                      !(function (e, t) {
                        var r = vr(Er(0, e.idbdb, t), e._dbSchema);
                        return !(
                          r.add.length ||
                          r.change.some(function (e) {
                            return e.add.length || e.change.length;
                          })
                        );
                      })(e, d) && !i)
                    )
                      return (
                        console.warn(
                          "Dexie SchemaDiff: Schema was extended without increasing the number passed to db.version(). Dexie will add missing parts and increment native version number to workaround this.",
                        ),
                        a.close(),
                        (o = a.version + 1),
                        (i = !0),
                        n(p())
                      );
                    pr(e, d);
                  } catch (e) {}
                (vt.push(e),
                  (a.onversionchange = ze(function (r) {
                    ((t.vcFired = !0), e.on("versionchange").fire(r));
                  })),
                  (a.onclose = ze(function (t) {
                    e.on("close").fire(t);
                  })),
                  f &&
                    (function (e, t) {
                      var r = e.indexedDB,
                        n = e.IDBKeyRange;
                      !kr(r) && t !== mt && xr(r, n).put({ name: t }).catch(re);
                    })(e._deps, c),
                  n());
              }, u)));
          }).catch(function (e) {
            switch (null == e ? void 0 : e.name) {
              case "UnknownError":
                if (t.PR1398_maxLoop > 0)
                  return (
                    t.PR1398_maxLoop--,
                    console.warn(
                      "Dexie: Workaround for Chrome UnknownError on open()",
                    ),
                    p()
                  );
                break;
              case "VersionError":
                if (o > 0) return ((o = 0), p());
            }
            return Fe.reject(e);
          });
        };
      return Fe.race([
        n,
        ("undefined" == typeof navigator
          ? Fe.resolve()
          : !navigator.userAgentData &&
              /Safari\//.test(navigator.userAgent) &&
              !/Chrom(e|ium)\//.test(navigator.userAgent) &&
              indexedDB.databases
            ? new Promise(function (e) {
                var t = function () {
                  return indexedDB.databases().finally(e);
                };
                ((u = setInterval(t, 100)), t());
              }).finally(function () {
                return clearInterval(u);
              })
            : Promise.resolve()
        ).then(p),
      ])
        .then(function () {
          return (
            a(),
            (t.onReadyBeingFired = []),
            Fe.resolve(
              jr(function () {
                return e.on.ready.fire(e.vip);
              }),
            ).then(function r() {
              if (t.onReadyBeingFired.length > 0) {
                var n = t.onReadyBeingFired.reduce(le, re);
                return (
                  (t.onReadyBeingFired = []),
                  Fe.resolve(
                    jr(function () {
                      return n(e.vip);
                    }),
                  ).then(r)
                );
              }
            })
          );
        })
        .finally(function () {
          t.openCanceller === n &&
            ((t.onReadyBeingFired = null), (t.isBeingOpened = !1));
        })
        .catch(function (r) {
          t.dbOpenError = r;
          try {
            l && l.abort();
          } catch (e) {}
          return (n === t.openCanceller && e._close(), lt(r));
        })
        .finally(function () {
          ((t.openComplete = !0), c());
        })
        .then(function () {
          if (f) {
            var t = {};
            (e.tables.forEach(function (r) {
              (r.schema.indexes.forEach(function (n) {
                n.name &&
                  (t[
                    "idb://"
                      .concat(e.name, "/")
                      .concat(r.name, "/")
                      .concat(n.name)
                  ] = new Rr(-1 / 0, [[[]]]));
              }),
                (t["idb://".concat(e.name, "/").concat(r.name, "/")] = t[
                  "idb://".concat(e.name, "/").concat(r.name, "/:dels")
                ] =
                  new Rr(-1 / 0, [[[]]])));
            }),
              er(Qt).fire(t),
              Kr(t, !0));
          }
          return e;
        });
    }
    function Gr(e) {
      var t = function (t) {
          return e.next(t);
        },
        r = o(t),
        n = o(function (t) {
          return e.throw(t);
        });
      function o(e) {
        return function (t) {
          var o = e(t),
            i = o.value;
          return o.done
            ? i
            : i && "function" == typeof i.then
              ? i.then(r, n)
              : c(i)
                ? Promise.all(i).then(r, n)
                : r(i);
        };
      }
      return o(t)();
    }
    function zr(e, t, r) {
      var n = arguments.length;
      if (n < 2) throw new Z.InvalidArgument("Too few arguments");
      for (var o = new Array(n - 1); --n;) o[n - 1] = arguments[n];
      return ((r = o.pop()), [e, P(o), r]);
    }
    function Vr(e, t, r, n, o) {
      return Fe.resolve().then(function () {
        var i = Pe.transless || Pe,
          a = e._createTransaction(t, r, e._dbSchema, n);
        a.explicit = !0;
        var u = { trans: a, transless: i };
        if (n) a.idbtrans = n.idbtrans;
        else
          try {
            (a.create(),
              (a.idbtrans._explicit = !0),
              (e._state.PR1398_maxLoop = 3));
          } catch (n) {
            return n.name === J.InvalidState &&
              e.isOpen() &&
              --e._state.PR1398_maxLoop > 0
              ? (console.warn("Dexie: Need to reopen db"),
                e.close({ disableAutoOpen: !1 }),
                e.open().then(function () {
                  return Vr(e, t, r, null, o);
                }))
              : lt(n);
          }
        var s,
          c = W(o);
        c && et();
        var l = Fe.follow(function () {
          if ((s = o.call(a, a)))
            if (c) {
              var e = tt.bind(null, null);
              s.then(e, e);
            } else
              "function" == typeof s.next &&
                "function" == typeof s.throw &&
                (s = Gr(s));
        }, u);
        return (
          s && "function" == typeof s.then
            ? Fe.resolve(s).then(function (e) {
                return a.active
                  ? e
                  : lt(
                      new Z.PrematureCommit(
                        "Transaction committed too early. See http://bit.ly/2kdckMn",
                      ),
                    );
              })
            : l.then(function () {
                return s;
              })
        )
          .then(function (e) {
            return (
              n && a._resolve(),
              a._completion.then(function () {
                return e;
              })
            );
          })
          .catch(function (e) {
            return (a._reject(e), lt(e));
          });
      });
    }
    function Yr(e, t, r) {
      for (var n = c(e) ? e.slice() : [e], o = 0; o < r; ++o) n.push(t);
      return n;
    }
    var Hr = {
      stack: "dbcore",
      name: "VirtualIndexMiddleware",
      level: 1,
      create: function (e) {
        return i(i({}, e), {
          table: function (t) {
            var r = e.table(t),
              n = r.schema,
              o = {},
              a = [];
            function u(e, t, r) {
              var n = cr(e),
                s = (o[n] = o[n] || []),
                c = null == e ? 0 : "string" == typeof e ? 1 : e.length,
                l = t > 0,
                f = i(i({}, r), {
                  name: l
                    ? "".concat(n, "(virtual-from:").concat(r.name, ")")
                    : r.name,
                  lowLevelIndex: r,
                  isVirtual: l,
                  keyTail: t,
                  keyLength: c,
                  extractKey: ar(e),
                  unique: !l && r.unique,
                });
              (s.push(f), f.isPrimaryKey || a.push(f), c > 1) &&
                u(2 === c ? e[0] : e.slice(0, c - 1), t + 1, r);
              return (
                s.sort(function (e, t) {
                  return e.keyTail - t.keyTail;
                }),
                f
              );
            }
            var s = u(n.primaryKey.keyPath, 0, n.primaryKey);
            o[":id"] = [s];
            for (var c = 0, l = n.indexes; c < l.length; c++) {
              var f = l[c];
              u(f.keyPath, 0, f);
            }
            function p(t) {
              var r,
                n,
                o = t.query.index;
              return o.isVirtual
                ? i(i({}, t), {
                    query: {
                      index: o.lowLevelIndex,
                      range:
                        ((r = t.query.range),
                        (n = o.keyTail),
                        {
                          type: 1 === r.type ? 2 : r.type,
                          lower: Yr(
                            r.lower,
                            r.lowerOpen ? e.MAX_KEY : e.MIN_KEY,
                            n,
                          ),
                          lowerOpen: !0,
                          upper: Yr(
                            r.upper,
                            r.upperOpen ? e.MIN_KEY : e.MAX_KEY,
                            n,
                          ),
                          upperOpen: !0,
                        }),
                    },
                  })
                : t;
            }
            var h = i(i({}, r), {
              schema: i(i({}, n), {
                primaryKey: s,
                indexes: a,
                getIndexByKeyPath: function (e) {
                  var t = o[cr(e)];
                  return t && t[0];
                },
              }),
              count: function (e) {
                return r.count(p(e));
              },
              query: function (e) {
                return r.query(p(e));
              },
              openCursor: function (t) {
                var n = t.query.index,
                  o = n.keyTail,
                  i = n.isVirtual,
                  a = n.keyLength;
                if (!i) return r.openCursor(t);
                return r.openCursor(p(t)).then(function (r) {
                  return (
                    r &&
                    (function (r) {
                      var n = Object.create(r, {
                        continue: {
                          value: function (n) {
                            null != n
                              ? r.continue(
                                  Yr(n, t.reverse ? e.MAX_KEY : e.MIN_KEY, o),
                                )
                              : t.unique
                                ? r.continue(
                                    r.key
                                      .slice(0, a)
                                      .concat(
                                        t.reverse ? e.MIN_KEY : e.MAX_KEY,
                                        o,
                                      ),
                                  )
                                : r.continue();
                          },
                        },
                        continuePrimaryKey: {
                          value: function (t, n) {
                            r.continuePrimaryKey(Yr(t, e.MAX_KEY, o), n);
                          },
                        },
                        primaryKey: {
                          get: function () {
                            return r.primaryKey;
                          },
                        },
                        key: {
                          get: function () {
                            var e = r.key;
                            return 1 === a ? e[0] : e.slice(0, a);
                          },
                        },
                        value: {
                          get: function () {
                            return r.value;
                          },
                        },
                      });
                      return n;
                    })(r)
                  );
                });
              },
            });
            return h;
          },
        });
      },
    };
    function Xr(e, t, r, n) {
      return (
        (r = r || {}),
        (n = n || ""),
        s(e).forEach(function (o) {
          if (h(t, o)) {
            var i = e[o],
              a = t[o];
            if ("object" == typeof i && "object" == typeof a && i && a) {
              var u = N(i);
              u !== N(a)
                ? (r[n + o] = t[o])
                : "Object" === u
                  ? Xr(i, a, r, n + o + ".")
                  : i !== a && (r[n + o] = t[o]);
            } else i !== a && (r[n + o] = t[o]);
          } else r[n + o] = void 0;
        }),
        s(t).forEach(function (o) {
          h(e, o) || (r[n + o] = t[o]);
        }),
        r
      );
    }
    function Jr(e, t) {
      return "delete" === t.type
        ? t.keys
        : t.keys || t.values.map(e.extractKey);
    }
    var Qr = {
      stack: "dbcore",
      name: "HooksMiddleware",
      level: 2,
      create: function (e) {
        return i(i({}, e), {
          table: function (t) {
            var r = e.table(t),
              n = r.schema.primaryKey;
            return i(i({}, r), {
              mutate: function (e) {
                var o = Pe.trans,
                  u = o.table(t).hook,
                  s = u.deleting,
                  c = u.creating,
                  l = u.updating;
                switch (e.type) {
                  case "add":
                    if (c.fire === re) break;
                    return o._promise(
                      "readwrite",
                      function () {
                        return f(e);
                      },
                      !0,
                    );
                  case "put":
                    if (c.fire === re && l.fire === re) break;
                    return o._promise(
                      "readwrite",
                      function () {
                        return f(e);
                      },
                      !0,
                    );
                  case "delete":
                    if (s.fire === re) break;
                    return o._promise(
                      "readwrite",
                      function () {
                        return f(e);
                      },
                      !0,
                    );
                  case "deleteRange":
                    if (s.fire === re) break;
                    return o._promise(
                      "readwrite",
                      function () {
                        return (function (e) {
                          return p(e.trans, e.range, 1e4);
                        })(e);
                      },
                      !0,
                    );
                }
                return r.mutate(e);
                function f(e) {
                  var t = Pe.trans,
                    o = e.keys || Jr(n, e);
                  if (!o) throw new Error("Keys missing");
                  return (
                    "delete" !==
                      (e =
                        "add" === e.type || "put" === e.type
                          ? i(i({}, e), { keys: o })
                          : i({}, e)).type && (e.values = a([], e.values, !0)),
                    e.keys && (e.keys = a([], e.keys, !0)),
                    (function (e, t, r) {
                      return "add" === t.type
                        ? Promise.resolve([])
                        : e.getMany({
                            trans: t.trans,
                            keys: r,
                            cache: "immutable",
                          });
                    })(r, e, o).then(function (i) {
                      var a = o.map(function (r, o) {
                        var a = i[o],
                          u = { onerror: null, onsuccess: null };
                        if ("delete" === e.type) s.fire.call(u, r, a, t);
                        else if ("add" === e.type || void 0 === a) {
                          var f = c.fire.call(u, r, e.values[o], t);
                          null == r &&
                            null != f &&
                            ((r = f),
                            (e.keys[o] = r),
                            n.outbound || x(e.values[o], n.keyPath, r));
                        } else {
                          var p = Xr(a, e.values[o]),
                            d = l.fire.call(u, p, r, a, t);
                          if (d) {
                            var y = e.values[o];
                            Object.keys(d).forEach(function (e) {
                              h(y, e) ? (y[e] = d[e]) : x(y, e, d[e]);
                            });
                          }
                        }
                        return u;
                      });
                      return r
                        .mutate(e)
                        .then(function (t) {
                          for (
                            var r = t.failures,
                              n = t.results,
                              u = t.numFailures,
                              s = t.lastResult,
                              c = 0;
                            c < o.length;
                            ++c
                          ) {
                            var l = n ? n[c] : o[c],
                              f = a[c];
                            null == l
                              ? f.onerror && f.onerror(r[c])
                              : f.onsuccess &&
                                f.onsuccess(
                                  "put" === e.type && i[c] ? e.values[c] : l,
                                );
                          }
                          return {
                            failures: r,
                            results: n,
                            numFailures: u,
                            lastResult: s,
                          };
                        })
                        .catch(function (e) {
                          return (
                            a.forEach(function (t) {
                              return t.onerror && t.onerror(e);
                            }),
                            Promise.reject(e)
                          );
                        });
                    })
                  );
                }
                function p(e, t, o) {
                  return r
                    .query({
                      trans: e,
                      values: !1,
                      query: { index: n, range: t },
                      limit: o,
                    })
                    .then(function (r) {
                      var n = r.result;
                      return f({ type: "delete", keys: n, trans: e }).then(
                        function (r) {
                          return r.numFailures > 0
                            ? Promise.reject(r.failures[0])
                            : n.length < o
                              ? {
                                  failures: [],
                                  numFailures: 0,
                                  lastResult: void 0,
                                }
                              : p(
                                  e,
                                  i(i({}, t), {
                                    lower: n[n.length - 1],
                                    lowerOpen: !0,
                                  }),
                                  o,
                                );
                        },
                      );
                    });
                }
              },
            });
          },
        });
      },
    };
    function Zr(e, t, r) {
      try {
        if (!t) return null;
        if (t.keys.length < e.length) return null;
        for (var n = [], o = 0, i = 0; o < t.keys.length && i < e.length; ++o)
          0 === Ot(t.keys[o], e[i]) &&
            (n.push(r ? D(t.values[o]) : t.values[o]), ++i);
        return n.length === e.length ? n : null;
      } catch (e) {
        return null;
      }
    }
    var en = {
      stack: "dbcore",
      level: -1,
      create: function (e) {
        return {
          table: function (t) {
            var r = e.table(t);
            return i(i({}, r), {
              getMany: function (e) {
                if (!e.cache) return r.getMany(e);
                var t = Zr(e.keys, e.trans._cache, "clone" === e.cache);
                return t
                  ? Fe.resolve(t)
                  : r.getMany(e).then(function (t) {
                      return (
                        (e.trans._cache = {
                          keys: e.keys,
                          values: "clone" === e.cache ? D(t) : t,
                        }),
                        t
                      );
                    });
              },
              mutate: function (e) {
                return (
                  "add" !== e.type && (e.trans._cache = null),
                  r.mutate(e)
                );
              },
            });
          },
        };
      },
    };
    function tn(e, t) {
      return (
        "readonly" === e.trans.mode &&
        !!e.subscr &&
        !e.trans.explicit &&
        "disabled" !== e.trans.db._options.cache &&
        !t.schema.primaryKey.outbound
      );
    }
    function rn(e, t) {
      switch (e) {
        case "query":
          return t.values && !t.unique;
        case "get":
        case "getMany":
        case "count":
        case "openCursor":
          return !1;
      }
    }
    var nn = {
      stack: "dbcore",
      level: 0,
      name: "Observability",
      create: function (e) {
        var t = e.schema.name,
          r = new Rr(e.MIN_KEY, e.MAX_KEY);
        return i(i({}, e), {
          transaction: function (t, r, n) {
            if (Pe.subscr && "readonly" !== r)
              throw new Z.ReadOnly(
                "Readwrite transaction in liveQuery context. Querier source: ".concat(
                  Pe.querier,
                ),
              );
            return e.transaction(t, r, n);
          },
          table: function (n) {
            var o = e.table(n),
              a = o.schema,
              u = a.primaryKey,
              l = a.indexes,
              f = u.extractKey,
              p = u.outbound,
              h =
                u.autoIncrement &&
                l.filter(function (e) {
                  return e.compound && e.keyPath.includes(u.keyPath);
                }),
              d = i(i({}, o), {
                mutate: function (i) {
                  var s,
                    l,
                    f = i.trans,
                    p = i.mutatedParts || (i.mutatedParts = {}),
                    d = function (e) {
                      var r = "idb://".concat(t, "/").concat(n, "/").concat(e);
                      return p[r] || (p[r] = new Rr());
                    },
                    y = d(""),
                    g = d(":dels"),
                    v = i.type,
                    m =
                      "deleteRange" === i.type
                        ? [i.range]
                        : "delete" === i.type
                          ? [i.keys]
                          : i.values.length < 50
                            ? [
                                Jr(u, i).filter(function (e) {
                                  return e;
                                }),
                                i.values,
                              ]
                            : [],
                    b = m[0],
                    w = m[1],
                    E = i.trans._cache;
                  if (c(b)) {
                    y.addKeys(b);
                    var _ =
                      "delete" === v || b.length === w.length ? Zr(b, E) : null;
                    (_ || g.addKeys(b),
                      (_ || w) &&
                        (function (e, t, r, n) {
                          function o(t) {
                            var o = e(t.name || "");
                            function i(e) {
                              return null != e ? t.extractKey(e) : null;
                            }
                            var a = function (e) {
                              return t.multiEntry && c(e)
                                ? e.forEach(function (e) {
                                    return o.addKey(e);
                                  })
                                : o.addKey(e);
                            };
                            (r || n).forEach(function (e, t) {
                              var o = r && i(r[t]),
                                u = n && i(n[t]);
                              0 !== Ot(o, u) &&
                                (null != o && a(o), null != u && a(u));
                            });
                          }
                          t.indexes.forEach(o);
                        })(d, a, _, w));
                  } else if (b) {
                    var S = {
                      from:
                        null !== (s = b.lower) && void 0 !== s ? s : e.MIN_KEY,
                      to:
                        null !== (l = b.upper) && void 0 !== l ? l : e.MAX_KEY,
                    };
                    (g.add(S), y.add(S));
                  } else
                    (y.add(r),
                      g.add(r),
                      a.indexes.forEach(function (e) {
                        return d(e.name).add(r);
                      }));
                  return o.mutate(i).then(function (e) {
                    return (
                      !b ||
                        ("add" !== i.type && "put" !== i.type) ||
                        (y.addKeys(e.results),
                        h &&
                          h.forEach(function (t) {
                            for (
                              var r = i.values.map(function (e) {
                                  return t.extractKey(e);
                                }),
                                n = t.keyPath.findIndex(function (e) {
                                  return e === u.keyPath;
                                }),
                                o = 0,
                                a = e.results.length;
                              o < a;
                              ++o
                            )
                              r[o][n] = e.results[o];
                            d(t.name).addKeys(r);
                          })),
                      (f.mutatedParts = Br(f.mutatedParts || {}, p)),
                      e
                    );
                  });
                },
              }),
              y = function (t) {
                var r,
                  n,
                  o = t.query,
                  i = o.index,
                  a = o.range;
                return [
                  i,
                  new Rr(
                    null !== (r = a.lower) && void 0 !== r ? r : e.MIN_KEY,
                    null !== (n = a.upper) && void 0 !== n ? n : e.MAX_KEY,
                  ),
                ];
              },
              g = {
                get: function (e) {
                  return [u, new Rr(e.key)];
                },
                getMany: function (e) {
                  return [u, new Rr().addKeys(e.keys)];
                },
                count: y,
                query: y,
                openCursor: y,
              };
            return (
              s(g).forEach(function (e) {
                d[e] = function (a) {
                  var u = Pe.subscr,
                    s = !!u,
                    c = tn(Pe, o) && rn(e, a) ? (a.obsSet = {}) : u;
                  if (s) {
                    var l = function (e) {
                        var r = "idb://"
                          .concat(t, "/")
                          .concat(n, "/")
                          .concat(e);
                        return c[r] || (c[r] = new Rr());
                      },
                      h = l(""),
                      d = l(":dels"),
                      y = g[e](a),
                      v = y[0],
                      m = y[1];
                    if (
                      ("query" === e && v.isPrimaryKey && !a.values
                        ? d.add(m)
                        : l(v.name || "").add(m),
                      !v.isPrimaryKey)
                    ) {
                      if ("count" !== e) {
                        var b =
                          "query" === e &&
                          p &&
                          a.values &&
                          o.query(i(i({}, a), { values: !1 }));
                        return o[e].apply(this, arguments).then(function (t) {
                          if ("query" === e) {
                            if (p && a.values)
                              return b.then(function (e) {
                                var r = e.result;
                                return (h.addKeys(r), t);
                              });
                            var r = a.values ? t.result.map(f) : t.result;
                            a.values ? h.addKeys(r) : d.addKeys(r);
                          } else if ("openCursor" === e) {
                            var n = t,
                              o = a.values;
                            return (
                              n &&
                              Object.create(n, {
                                key: {
                                  get: function () {
                                    return (d.addKey(n.primaryKey), n.key);
                                  },
                                },
                                primaryKey: {
                                  get: function () {
                                    var e = n.primaryKey;
                                    return (d.addKey(e), e);
                                  },
                                },
                                value: {
                                  get: function () {
                                    return (
                                      o && h.addKey(n.primaryKey),
                                      n.value
                                    );
                                  },
                                },
                              })
                            );
                          }
                          return t;
                        });
                      }
                      d.add(r);
                    }
                  }
                  return o[e].apply(this, arguments);
                };
              }),
              d
            );
          },
        });
      },
    };
    function on(e, t, r) {
      if (0 === r.numFailures) return t;
      if ("deleteRange" === t.type) return null;
      var n = t.keys
        ? t.keys.length
        : "values" in t && t.values
          ? t.values.length
          : 1;
      if (r.numFailures === n) return null;
      var o = i({}, t);
      return (
        c(o.keys) &&
          (o.keys = o.keys.filter(function (e, t) {
            return !(t in r.failures);
          })),
        "values" in o &&
          c(o.values) &&
          (o.values = o.values.filter(function (e, t) {
            return !(t in r.failures);
          })),
        o
      );
    }
    function an(e, t) {
      return (
        (function (e, t) {
          return (
            void 0 === t.lower ||
            (t.lowerOpen ? Ot(e, t.lower) > 0 : Ot(e, t.lower) >= 0)
          );
        })(e, t) &&
        (function (e, t) {
          return (
            void 0 === t.upper ||
            (t.upperOpen ? Ot(e, t.upper) < 0 : Ot(e, t.upper) <= 0)
          );
        })(e, t)
      );
    }
    function un(e, t, r, n, o, i) {
      if (!r || 0 === r.length) return e;
      var a = t.query.index,
        u = a.multiEntry,
        s = t.query.range,
        l = n.schema.primaryKey.extractKey,
        f = a.extractKey,
        p = (a.lowLevelIndex || a).extractKey,
        h = r.reduce(function (e, r) {
          var n = e,
            o = [];
          if ("add" === r.type || "put" === r.type)
            for (var i = new Rr(), a = r.values.length - 1; a >= 0; --a) {
              var p = r.values[a],
                h = l(p);
              if (!i.hasKey(h)) {
                var d = f(p);
                (u && c(d)
                  ? d.some(function (e) {
                      return an(e, s);
                    })
                  : an(d, s)) && (i.addKey(h), o.push(p));
              }
            }
          switch (r.type) {
            case "add":
              var y = new Rr().addKeys(
                t.values
                  ? e.map(function (e) {
                      return l(e);
                    })
                  : e,
              );
              n = e.concat(
                t.values
                  ? o.filter(function (e) {
                      var t = l(e);
                      return !y.hasKey(t) && (y.addKey(t), !0);
                    })
                  : o
                      .map(function (e) {
                        return l(e);
                      })
                      .filter(function (e) {
                        return !y.hasKey(e) && (y.addKey(e), !0);
                      }),
              );
              break;
            case "put":
              var g = new Rr().addKeys(
                r.values.map(function (e) {
                  return l(e);
                }),
              );
              n = e
                .filter(function (e) {
                  return !g.hasKey(t.values ? l(e) : e);
                })
                .concat(
                  t.values
                    ? o
                    : o.map(function (e) {
                        return l(e);
                      }),
                );
              break;
            case "delete":
              var v = new Rr().addKeys(r.keys);
              n = e.filter(function (e) {
                return !v.hasKey(t.values ? l(e) : e);
              });
              break;
            case "deleteRange":
              var m = r.range;
              n = e.filter(function (e) {
                return !an(l(e), m);
              });
          }
          return n;
        }, e);
      return h === e
        ? e
        : (h.sort(function (e, t) {
            return Ot(p(e), p(t)) || Ot(l(e), l(t));
          }),
          t.limit &&
            t.limit < 1 / 0 &&
            (h.length > t.limit
              ? (h.length = t.limit)
              : e.length === t.limit && h.length < t.limit && (o.dirty = !0)),
          i ? Object.freeze(h) : h);
    }
    function sn(e, t) {
      return (
        0 === Ot(e.lower, t.lower) &&
        0 === Ot(e.upper, t.upper) &&
        !!e.lowerOpen == !!t.lowerOpen &&
        !!e.upperOpen == !!t.upperOpen
      );
    }
    function cn(e, t) {
      return (
        (function (e, t, r, n) {
          if (void 0 === e) return void 0 !== t ? -1 : 0;
          if (void 0 === t) return 1;
          var o = Ot(e, t);
          if (0 === o) {
            if (r && n) return 0;
            if (r) return 1;
            if (n) return -1;
          }
          return o;
        })(e.lower, t.lower, e.lowerOpen, t.lowerOpen) <= 0 &&
        (function (e, t, r, n) {
          if (void 0 === e) return void 0 !== t ? 1 : 0;
          if (void 0 === t) return -1;
          var o = Ot(e, t);
          if (0 === o) {
            if (r && n) return 0;
            if (r) return -1;
            if (n) return 1;
          }
          return o;
        })(e.upper, t.upper, e.upperOpen, t.upperOpen) >= 0
      );
    }
    function ln(e, t, r, n) {
      (e.subscribers.add(r),
        n.addEventListener("abort", function () {
          (e.subscribers.delete(r),
            0 === e.subscribers.size &&
              (function (e, t) {
                setTimeout(function () {
                  0 === e.subscribers.size && U(t, e);
                }, 3e3);
              })(e, t));
        }));
    }
    var fn = {
      stack: "dbcore",
      level: 0,
      name: "Cache",
      create: function (e) {
        var t = e.schema.name;
        return i(i({}, e), {
          transaction: function (r, n, o) {
            var i = e.transaction(r, n, o);
            if ("readwrite" === n) {
              var a = new AbortController(),
                u = a.signal,
                s = function (o) {
                  return function () {
                    if ((a.abort(), "readwrite" === n)) {
                      for (var u = new Set(), s = 0, c = r; s < c.length; s++) {
                        var l = c[s],
                          f = Lr["idb://".concat(t, "/").concat(l)];
                        if (f) {
                          var p = e.table(l),
                            h = f.optimisticOps.filter(function (e) {
                              return e.trans === i;
                            });
                          if (i._explicit && o && i.mutatedParts)
                            for (
                              var d = 0, y = Object.values(f.queries.query);
                              d < y.length;
                              d++
                            )
                              for (
                                var g = 0, v = (w = y[d]).slice();
                                g < v.length;
                                g++
                              ) {
                                Nr((S = v[g]).obsSet, i.mutatedParts) &&
                                  (U(w, S),
                                  S.subscribers.forEach(function (e) {
                                    return u.add(e);
                                  }));
                              }
                          else if (h.length > 0) {
                            f.optimisticOps = f.optimisticOps.filter(
                              function (e) {
                                return e.trans !== i;
                              },
                            );
                            for (
                              var m = 0, b = Object.values(f.queries.query);
                              m < b.length;
                              m++
                            )
                              for (
                                var w, E = 0, _ = (w = b[m]).slice();
                                E < _.length;
                                E++
                              ) {
                                var S;
                                if (null != (S = _[E]).res && i.mutatedParts)
                                  if (o && !S.dirty) {
                                    var A = Object.isFrozen(S.res),
                                      O = un(S.res, S.req, h, p, S, A);
                                    S.dirty
                                      ? (U(w, S),
                                        S.subscribers.forEach(function (e) {
                                          return u.add(e);
                                        }))
                                      : O !== S.res &&
                                        ((S.res = O),
                                        (S.promise = Fe.resolve({
                                          result: O,
                                        })));
                                  } else
                                    (S.dirty && U(w, S),
                                      S.subscribers.forEach(function (e) {
                                        return u.add(e);
                                      }));
                              }
                          }
                        }
                      }
                      u.forEach(function (e) {
                        return e();
                      });
                    }
                  };
                };
              (i.addEventListener("abort", s(!1), { signal: u }),
                i.addEventListener("error", s(!1), { signal: u }),
                i.addEventListener("complete", s(!0), { signal: u }));
            }
            return i;
          },
          table: function (r) {
            var n = e.table(r),
              o = n.schema.primaryKey;
            return i(i({}, n), {
              mutate: function (e) {
                var a = Pe.trans;
                if (
                  o.outbound ||
                  "disabled" === a.db._options.cache ||
                  a.explicit ||
                  "readwrite" !== a.idbtrans.mode
                )
                  return n.mutate(e);
                var u = Lr["idb://".concat(t, "/").concat(r)];
                if (!u) return n.mutate(e);
                var s = n.mutate(e);
                return (
                  ("add" !== e.type && "put" !== e.type) ||
                  !(
                    e.values.length >= 50 ||
                    Jr(o, e).some(function (e) {
                      return null == e;
                    })
                  )
                    ? (u.optimisticOps.push(e),
                      e.mutatedParts && qr(e.mutatedParts),
                      s.then(function (t) {
                        if (t.numFailures > 0) {
                          U(u.optimisticOps, e);
                          var r = on(0, e, t);
                          (r && u.optimisticOps.push(r),
                            e.mutatedParts && qr(e.mutatedParts));
                        }
                      }),
                      s.catch(function () {
                        (U(u.optimisticOps, e),
                          e.mutatedParts && qr(e.mutatedParts));
                      }))
                    : s.then(function (t) {
                        var r = on(
                          0,
                          i(i({}, e), {
                            values: e.values.map(function (e, r) {
                              var n;
                              if (t.failures[r]) return e;
                              var a = (
                                null === (n = o.keyPath) || void 0 === n
                                  ? void 0
                                  : n.includes(".")
                              )
                                ? D(e)
                                : i({}, e);
                              return (x(a, o.keyPath, t.results[r]), a);
                            }),
                          }),
                          t,
                        );
                        (u.optimisticOps.push(r),
                          queueMicrotask(function () {
                            return e.mutatedParts && qr(e.mutatedParts);
                          }));
                      }),
                  s
                );
              },
              query: function (e) {
                var o;
                if (!tn(Pe, n) || !rn("query", e)) return n.query(e);
                var i =
                    "immutable" ===
                    (null === (o = Pe.trans) || void 0 === o
                      ? void 0
                      : o.db._options.cache),
                  a = Pe,
                  u = a.requery,
                  s = a.signal,
                  c = (function (e, t, r, n) {
                    var o = Lr["idb://".concat(e, "/").concat(t)];
                    if (!o) return [];
                    var i = o.queries[r];
                    if (!i) return [null, !1, o, null];
                    var a = i[(n.query ? n.query.index.name : null) || ""];
                    if (!a) return [null, !1, o, null];
                    switch (r) {
                      case "query":
                        var u = a.find(function (e) {
                          return (
                            e.req.limit === n.limit &&
                            e.req.values === n.values &&
                            sn(e.req.query.range, n.query.range)
                          );
                        });
                        return u
                          ? [u, !0, o, a]
                          : [
                              a.find(function (e) {
                                return (
                                  ("limit" in e.req ? e.req.limit : 1 / 0) >=
                                    n.limit &&
                                  (!n.values || e.req.values) &&
                                  cn(e.req.query.range, n.query.range)
                                );
                              }),
                              !1,
                              o,
                              a,
                            ];
                      case "count":
                        var s = a.find(function (e) {
                          return sn(e.req.query.range, n.query.range);
                        });
                        return [s, !!s, o, a];
                    }
                  })(t, r, "query", e),
                  l = c[0],
                  f = c[1],
                  p = c[2],
                  h = c[3];
                if (l && f) l.obsSet = e.obsSet;
                else {
                  var d = n
                    .query(e)
                    .then(function (e) {
                      var t = e.result;
                      if ((l && (l.res = t), i)) {
                        for (var r = 0, n = t.length; r < n; ++r)
                          Object.freeze(t[r]);
                        Object.freeze(t);
                      } else e.result = D(t);
                      return e;
                    })
                    .catch(function (e) {
                      return (h && l && U(h, l), Promise.reject(e));
                    });
                  ((l = {
                    obsSet: e.obsSet,
                    promise: d,
                    subscribers: new Set(),
                    type: "query",
                    req: e,
                    dirty: !1,
                  }),
                    h
                      ? h.push(l)
                      : ((h = [l]),
                        p ||
                          (p = Lr["idb://".concat(t, "/").concat(r)] =
                            {
                              queries: { query: {}, count: {} },
                              objs: new Map(),
                              optimisticOps: [],
                              unsignaledParts: {},
                            }),
                        (p.queries.query[e.query.index.name || ""] = h)));
                }
                return (
                  ln(l, h, u, s),
                  l.promise.then(function (t) {
                    return {
                      result: un(
                        t.result,
                        e,
                        null == p ? void 0 : p.optimisticOps,
                        n,
                        l,
                        i,
                      ),
                    };
                  })
                );
              },
            });
          },
        });
      },
    };
    function pn(e, t) {
      return new Proxy(e, {
        get: function (e, r, n) {
          return "db" === r ? t : Reflect.get(e, r, n);
        },
      });
    }
    var hn,
      dn = (function () {
        function e(t, r) {
          var n = this;
          ((this._middlewares = {}), (this.verno = 0));
          var o = e.dependencies;
          ((this._options = r =
            i(
              {
                addons: e.addons,
                autoOpen: !0,
                indexedDB: o.indexedDB,
                IDBKeyRange: o.IDBKeyRange,
                cache: "cloned",
              },
              r,
            )),
            (this._deps = {
              indexedDB: r.indexedDB,
              IDBKeyRange: r.IDBKeyRange,
            }));
          var a = r.addons;
          ((this._dbSchema = {}),
            (this._versions = []),
            (this._storeNames = []),
            (this._allTables = {}),
            (this.idbdb = null),
            (this._novip = this));
          var u,
            s = {
              dbOpenError: null,
              isBeingOpened: !1,
              onReadyBeingFired: null,
              openComplete: !1,
              dbReadyResolve: re,
              dbReadyPromise: null,
              cancelOpen: re,
              openCanceller: null,
              autoSchema: !0,
              PR1398_maxLoop: 3,
              autoOpen: r.autoOpen,
            };
          ((s.dbReadyPromise = new Fe(function (e) {
            s.dbReadyResolve = e;
          })),
            (s.openCanceller = new Fe(function (e, t) {
              s.cancelOpen = t;
            })),
            (this._state = s),
            (this.name = t),
            (this.on = Pt(
              this,
              "populate",
              "blocked",
              "versionchange",
              "close",
              { ready: [le, re] },
            )),
            (this.on.ready.subscribe = _(this.on.ready.subscribe, function (t) {
              return function (r, o) {
                e.vip(function () {
                  var e = n._state;
                  if (e.openComplete)
                    (e.dbOpenError || Fe.resolve().then(r), o && t(r));
                  else if (e.onReadyBeingFired)
                    (e.onReadyBeingFired.push(r), o && t(r));
                  else {
                    t(r);
                    var i = n;
                    o ||
                      t(function e() {
                        (i.on.ready.unsubscribe(r), i.on.ready.unsubscribe(e));
                      });
                  }
                });
              };
            })),
            (this.Collection =
              ((u = this),
              Rt(Mt.prototype, function (e, t) {
                this.db = u;
                var r = _t,
                  n = null;
                if (t)
                  try {
                    r = t();
                  } catch (e) {
                    n = e;
                  }
                var o = e._ctx,
                  i = o.table,
                  a = i.hook.reading.fire;
                this._ctx = {
                  table: i,
                  index: o.index,
                  isPrimKey:
                    !o.index ||
                    (i.schema.primKey.keyPath &&
                      o.index === i.schema.primKey.name),
                  range: r,
                  keysOnly: !1,
                  dir: "next",
                  unique: "",
                  algorithm: null,
                  filter: null,
                  replayFilter: null,
                  justLimit: !0,
                  isMatch: null,
                  offset: 0,
                  limit: 1 / 0,
                  error: n,
                  or: o.or,
                  valueMapper: a !== ne ? a : null,
                };
              }))),
            (this.Table = (function (e) {
              return Rt(jt.prototype, function (t, r, n) {
                ((this.db = e),
                  (this._tx = n),
                  (this.name = t),
                  (this.schema = r),
                  (this.hook = e._allTables[t]
                    ? e._allTables[t].hook
                    : Pt(null, {
                        creating: [ae, re],
                        reading: [oe, ne],
                        updating: [se, re],
                        deleting: [ue, re],
                      })));
              });
            })(this)),
            (this.Transaction = (function (e) {
              return Rt(tr.prototype, function (t, r, n, o, i) {
                var a = this;
                ((this.db = e),
                  (this.mode = t),
                  (this.storeNames = r),
                  (this.schema = n),
                  (this.chromeTransactionDurability = o),
                  (this.idbtrans = null),
                  (this.on = Pt(this, "complete", "error", "abort")),
                  (this.parent = i || null),
                  (this.active = !0),
                  (this._reculock = 0),
                  (this._blockedFuncs = []),
                  (this._resolve = null),
                  (this._reject = null),
                  (this._waitingFor = null),
                  (this._waitingQueue = null),
                  (this._spinCount = 0),
                  (this._completion = new Fe(function (e, t) {
                    ((a._resolve = e), (a._reject = t));
                  })),
                  this._completion.then(
                    function () {
                      ((a.active = !1), a.on.complete.fire());
                    },
                    function (e) {
                      var t = a.active;
                      return (
                        (a.active = !1),
                        a.on.error.fire(e),
                        a.parent
                          ? a.parent._reject(e)
                          : t && a.idbtrans && a.idbtrans.abort(),
                        lt(e)
                      );
                    },
                  ));
              });
            })(this)),
            (this.Version = (function (e) {
              return Rt(Or.prototype, function (t) {
                ((this.db = e),
                  (this._cfg = {
                    version: t,
                    storesSource: null,
                    dbschema: {},
                    tables: {},
                    contentUpgrade: null,
                  }));
              });
            })(this)),
            (this.WhereClause = (function (e) {
              return Rt(Ht.prototype, function (t, r, n) {
                if (
                  ((this.db = e),
                  (this._ctx = {
                    table: t,
                    index: ":id" === r ? null : r,
                    or: n,
                  }),
                  (this._cmp = this._ascending = Ot),
                  (this._descending = function (e, t) {
                    return Ot(t, e);
                  }),
                  (this._max = function (e, t) {
                    return Ot(e, t) > 0 ? e : t;
                  }),
                  (this._min = function (e, t) {
                    return Ot(e, t) < 0 ? e : t;
                  }),
                  (this._IDBKeyRange = e._deps.IDBKeyRange),
                  !this._IDBKeyRange)
                )
                  throw new Z.MissingAPI();
              });
            })(this)),
            this.on("versionchange", function (e) {
              (e.newVersion > 0
                ? console.warn(
                    "Another connection wants to upgrade database '".concat(
                      n.name,
                      "'. Closing db now to resume the upgrade.",
                    ),
                  )
                : console.warn(
                    "Another connection wants to delete database '".concat(
                      n.name,
                      "'. Closing db now to resume the delete request.",
                    ),
                  ),
                n.close({ disableAutoOpen: !1 }));
            }),
            this.on("blocked", function (e) {
              !e.newVersion || e.newVersion < e.oldVersion
                ? console.warn(
                    "Dexie.delete('".concat(n.name, "') was blocked"),
                  )
                : console.warn(
                    "Upgrade '"
                      .concat(
                        n.name,
                        "' blocked by other connection holding version ",
                      )
                      .concat(e.oldVersion / 10),
                  );
            }),
            (this._maxKey = ir(r.IDBKeyRange)),
            (this._createTransaction = function (e, t, r, o) {
              return new n.Transaction(
                e,
                t,
                r,
                n._options.chromeTransactionDurability,
                o,
              );
            }),
            (this._fireOnBlocked = function (e) {
              (n.on("blocked").fire(e),
                vt
                  .filter(function (e) {
                    return e.name === n.name && e !== n && !e._state.vcFired;
                  })
                  .map(function (t) {
                    return t.on("versionchange").fire(e);
                  }));
            }),
            this.use(en),
            this.use(fn),
            this.use(nn),
            this.use(Hr),
            this.use(Qr));
          var c = new Proxy(this, {
            get: function (e, t, r) {
              if ("_vip" === t) return !0;
              if ("table" === t)
                return function (e) {
                  return pn(n.table(e), c);
                };
              var o = Reflect.get(e, t, r);
              return o instanceof jt
                ? pn(o, c)
                : "tables" === t
                  ? o.map(function (e) {
                      return pn(e, c);
                    })
                  : "_createTransaction" === t
                    ? function () {
                        return pn(o.apply(this, arguments), c);
                      }
                    : o;
            },
          });
          ((this.vip = c),
            a.forEach(function (e) {
              return e(n);
            }));
        }
        return (
          (e.prototype.version = function (e) {
            if (isNaN(e) || e < 0.1)
              throw new Z.Type("Given version is not a positive number");
            if (
              ((e = Math.round(10 * e) / 10),
              this.idbdb || this._state.isBeingOpened)
            )
              throw new Z.Schema("Cannot add version when database is open");
            this.verno = Math.max(this.verno, e);
            var t = this._versions,
              r = t.filter(function (t) {
                return t._cfg.version === e;
              })[0];
            return (
              r ||
              ((r = new this.Version(e)),
              t.push(r),
              t.sort(yr),
              r.stores({}),
              (this._state.autoSchema = !1),
              r)
            );
          }),
          (e.prototype._whenReady = function (e) {
            var t = this;
            return this.idbdb &&
              (this._state.openComplete || Pe.letThrough || this._vip)
              ? e()
              : new Fe(function (e, r) {
                  if (t._state.openComplete)
                    return r(new Z.DatabaseClosed(t._state.dbOpenError));
                  if (!t._state.isBeingOpened) {
                    if (!t._state.autoOpen)
                      return void r(new Z.DatabaseClosed());
                    t.open().catch(re);
                  }
                  t._state.dbReadyPromise.then(e, r);
                }).then(e);
          }),
          (e.prototype.use = function (e) {
            var t = e.stack,
              r = e.create,
              n = e.level,
              o = e.name;
            o && this.unuse({ stack: t, name: o });
            var i = this._middlewares[t] || (this._middlewares[t] = []);
            return (
              i.push({
                stack: t,
                create: r,
                level: null == n ? 10 : n,
                name: o,
              }),
              i.sort(function (e, t) {
                return e.level - t.level;
              }),
              this
            );
          }),
          (e.prototype.unuse = function (e) {
            var t = e.stack,
              r = e.name,
              n = e.create;
            return (
              t &&
                this._middlewares[t] &&
                (this._middlewares[t] = this._middlewares[t].filter(
                  function (e) {
                    return n ? e.create !== n : !!r && e.name !== r;
                  },
                )),
              this
            );
          }),
          (e.prototype.open = function () {
            var e = this;
            return ut(je, function () {
              return $r(e);
            });
          }),
          (e.prototype._close = function () {
            var e = this._state,
              t = vt.indexOf(this);
            if ((t >= 0 && vt.splice(t, 1), this.idbdb)) {
              try {
                this.idbdb.close();
              } catch (e) {}
              this.idbdb = null;
            }
            e.isBeingOpened ||
              ((e.dbReadyPromise = new Fe(function (t) {
                e.dbReadyResolve = t;
              })),
              (e.openCanceller = new Fe(function (t, r) {
                e.cancelOpen = r;
              })));
          }),
          (e.prototype.close = function (e) {
            var t = (void 0 === e ? { disableAutoOpen: !0 } : e)
                .disableAutoOpen,
              r = this._state;
            t
              ? (r.isBeingOpened && r.cancelOpen(new Z.DatabaseClosed()),
                this._close(),
                (r.autoOpen = !1),
                (r.dbOpenError = new Z.DatabaseClosed()))
              : (this._close(),
                (r.autoOpen = this._options.autoOpen || r.isBeingOpened),
                (r.openComplete = !1),
                (r.dbOpenError = null));
          }),
          (e.prototype.delete = function (e) {
            var t = this;
            void 0 === e && (e = { disableAutoOpen: !0 });
            var r = arguments.length > 0 && "object" != typeof arguments[0],
              n = this._state;
            return new Fe(function (o, i) {
              var a = function () {
                t.close(e);
                var r = t._deps.indexedDB.deleteDatabase(t.name);
                ((r.onsuccess = ze(function () {
                  var e, r, n, i;
                  ((e = t._deps),
                    (r = t.name),
                    (n = e.indexedDB),
                    (i = e.IDBKeyRange),
                    !kr(n) && r !== mt && xr(n, i).delete(r).catch(re),
                    o());
                })),
                  (r.onerror = Xt(i)),
                  (r.onblocked = t._fireOnBlocked));
              };
              if (r)
                throw new Z.InvalidArgument(
                  "Invalid closeOptions argument to db.delete()",
                );
              n.isBeingOpened ? n.dbReadyPromise.then(a) : a();
            });
          }),
          (e.prototype.backendDB = function () {
            return this.idbdb;
          }),
          (e.prototype.isOpen = function () {
            return null !== this.idbdb;
          }),
          (e.prototype.hasBeenClosed = function () {
            var e = this._state.dbOpenError;
            return e && "DatabaseClosed" === e.name;
          }),
          (e.prototype.hasFailed = function () {
            return null !== this._state.dbOpenError;
          }),
          (e.prototype.dynamicallyOpened = function () {
            return this._state.autoSchema;
          }),
          Object.defineProperty(e.prototype, "tables", {
            get: function () {
              var e = this;
              return s(this._allTables).map(function (t) {
                return e._allTables[t];
              });
            },
            enumerable: !1,
            configurable: !0,
          }),
          (e.prototype.transaction = function () {
            var e = zr.apply(this, arguments);
            return this._transaction.apply(this, e);
          }),
          (e.prototype._transaction = function (e, t, r) {
            var n = this,
              o = Pe.trans;
            (o && o.db === this && -1 === e.indexOf("!")) || (o = null);
            var i,
              a,
              u = -1 !== e.indexOf("?");
            e = e.replace("!", "").replace("?", "");
            try {
              if (
                ((a = t.map(function (e) {
                  var t = e instanceof n.Table ? e.name : e;
                  if ("string" != typeof t)
                    throw new TypeError(
                      "Invalid table argument to Dexie.transaction(). Only Table or String are allowed",
                    );
                  return t;
                })),
                "r" == e || e === bt)
              )
                i = bt;
              else {
                if ("rw" != e && e != wt)
                  throw new Z.InvalidArgument("Invalid transaction mode: " + e);
                i = wt;
              }
              if (o) {
                if (o.mode === bt && i === wt) {
                  if (!u)
                    throw new Z.SubTransaction(
                      "Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY",
                    );
                  o = null;
                }
                (o &&
                  a.forEach(function (e) {
                    if (o && -1 === o.storeNames.indexOf(e)) {
                      if (!u)
                        throw new Z.SubTransaction(
                          "Table " + e + " not included in parent transaction.",
                        );
                      o = null;
                    }
                  }),
                  u && o && !o.active && (o = null));
              }
            } catch (e) {
              return o
                ? o._promise(null, function (t, r) {
                    r(e);
                  })
                : lt(e);
            }
            var s = Vr.bind(null, this, i, a, o, r);
            return o
              ? o._promise(i, s, "lock")
              : Pe.trans
                ? ut(Pe.transless, function () {
                    return n._whenReady(s);
                  })
                : this._whenReady(s);
          }),
          (e.prototype.table = function (e) {
            if (!h(this._allTables, e))
              throw new Z.InvalidTable("Table ".concat(e, " does not exist"));
            return this._allTables[e];
          }),
          e
        );
      })(),
      yn =
        "undefined" != typeof Symbol && "observable" in Symbol
          ? Symbol.observable
          : "@@observable",
      gn = (function () {
        function e(e) {
          this._subscribe = e;
        }
        return (
          (e.prototype.subscribe = function (e, t, r) {
            return this._subscribe(
              e && "function" != typeof e
                ? e
                : { next: e, error: t, complete: r },
            );
          }),
          (e.prototype[yn] = function () {
            return this;
          }),
          e
        );
      })();
    try {
      hn = {
        indexedDB:
          u.indexedDB || u.mozIndexedDB || u.webkitIndexedDB || u.msIndexedDB,
        IDBKeyRange: u.IDBKeyRange || u.webkitIDBKeyRange,
      };
    } catch (e) {
      hn = { indexedDB: null, IDBKeyRange: null };
    }
    var vn = dn;
    function mn(e) {
      var t = wn;
      try {
        ((wn = !0), er.storagemutated.fire(e), Kr(e, !0));
      } finally {
        wn = t;
      }
    }
    (d(
      vn,
      i(i({}, te), {
        delete: function (e) {
          return new vn(e, { addons: [] }).delete();
        },
        exists: function (e) {
          return new vn(e, { addons: [] })
            .open()
            .then(function (e) {
              return (e.close(), !0);
            })
            .catch("NoSuchDatabaseError", function () {
              return !1;
            });
        },
        getDatabaseNames: function (e) {
          try {
            return ((t = vn.dependencies),
            (r = t.indexedDB),
            (n = t.IDBKeyRange),
            kr(r)
              ? Promise.resolve(r.databases()).then(function (e) {
                  return e
                    .map(function (e) {
                      return e.name;
                    })
                    .filter(function (e) {
                      return e !== mt;
                    });
                })
              : xr(r, n).toCollection().primaryKeys()).then(e);
          } catch (t) {
            return lt(new Z.MissingAPI());
          }
          var t, r, n;
        },
        defineClass: function () {
          return function (e) {
            l(this, e);
          };
        },
        ignoreTransaction: function (e) {
          return Pe.trans ? ut(Pe.transless, e) : e();
        },
        vip: jr,
        async: function (e) {
          return function () {
            try {
              var t = Gr(e.apply(this, arguments));
              return t && "function" == typeof t.then ? t : Fe.resolve(t);
            } catch (e) {
              return lt(e);
            }
          };
        },
        spawn: function (e, t, r) {
          try {
            var n = Gr(e.apply(r, t || []));
            return n && "function" == typeof n.then ? n : Fe.resolve(n);
          } catch (e) {
            return lt(e);
          }
        },
        currentTransaction: {
          get: function () {
            return Pe.trans || null;
          },
        },
        waitFor: function (e, t) {
          var r = Fe.resolve(
            "function" == typeof e ? vn.ignoreTransaction(e) : e,
          ).timeout(t || 6e4);
          return Pe.trans ? Pe.trans.waitFor(r) : r;
        },
        Promise: Fe,
        debug: {
          get: function () {
            return fe;
          },
          set: function (e) {
            pe(e);
          },
        },
        derive: v,
        extend: l,
        props: d,
        override: _,
        Events: Pt,
        on: er,
        liveQuery: function (e) {
          var t,
            r = !1,
            n = new gn(function (n) {
              var o = W(e);
              var i,
                a = !1,
                u = {},
                s = {},
                c = {
                  get closed() {
                    return a;
                  },
                  unsubscribe: function () {
                    a ||
                      ((a = !0),
                      i && i.abort(),
                      l && er.storagemutated.unsubscribe(p));
                  },
                };
              n.start && n.start(c);
              var l = !1,
                f = function () {
                  return ct(d);
                };
              var p = function (e) {
                  (Br(u, e), Nr(s, u) && f());
                },
                d = function () {
                  if (!a && hn.indexedDB) {
                    u = {};
                    var c = {};
                    (i && i.abort(), (i = new AbortController()));
                    var d = {
                        subscr: c,
                        signal: i.signal,
                        requery: f,
                        querier: e,
                        trans: null,
                      },
                      y = (function (t) {
                        var r = Ke();
                        try {
                          o && et();
                          var n = Ze(e, t);
                          return (o && (n = n.finally(tt)), n);
                        } finally {
                          r && We();
                        }
                      })(d);
                    Promise.resolve(y).then(
                      function (e) {
                        ((r = !0),
                          (t = e),
                          a ||
                            d.signal.aborted ||
                            ((u = {}),
                            (function (e) {
                              for (var t in e) if (h(e, t)) return !1;
                              return !0;
                            })((s = c)) ||
                              l ||
                              (er(Qt, p), (l = !0)),
                            ct(function () {
                              return !a && n.next && n.next(e);
                            })));
                      },
                      function (e) {
                        ((r = !1),
                          ["DatabaseClosedError", "AbortError"].includes(
                            null == e ? void 0 : e.name,
                          ) ||
                            a ||
                            ct(function () {
                              a || (n.error && n.error(e));
                            }));
                      },
                    );
                  }
                };
              return (setTimeout(f, 0), c);
            });
          return (
            (n.hasValue = function () {
              return r;
            }),
            (n.getValue = function () {
              return t;
            }),
            n
          );
        },
        extendObservabilitySet: Br,
        getByKeyPath: O,
        setByKeyPath: x,
        delByKeyPath: function (e, t) {
          "string" == typeof t
            ? x(e, t, void 0)
            : "length" in t &&
              [].map.call(t, function (t) {
                x(e, t, void 0);
              });
        },
        shallowClone: k,
        deepClone: D,
        getObjectDiff: Xr,
        cmp: Ot,
        asap: A,
        minKey: dt,
        addons: [],
        connections: vt,
        errnames: J,
        dependencies: hn,
        cache: Lr,
        semVer: pt,
        version: pt
          .split(".")
          .map(function (e) {
            return parseInt(e);
          })
          .reduce(function (e, t, r) {
            return e + t / Math.pow(10, 2 * r);
          }),
      }),
    ),
      (vn.maxKey = ir(vn.dependencies.IDBKeyRange)),
      "undefined" != typeof dispatchEvent &&
        "undefined" != typeof addEventListener &&
        (er(Qt, function (e) {
          var t;
          wn ||
            ((t = new CustomEvent(Zt, { detail: e })),
            (wn = !0),
            dispatchEvent(t),
            (wn = !1));
        }),
        addEventListener(Zt, function (e) {
          var t = e.detail;
          wn || mn(t);
        })));
    var bn,
      wn = !1,
      En = function () {};
    ("undefined" != typeof BroadcastChannel &&
      ((En = function () {
        (bn = new BroadcastChannel(Zt)).onmessage = function (e) {
          return e.data && mn(e.data);
        };
      })(),
      "function" == typeof bn.unref && bn.unref(),
      er(Qt, function (e) {
        wn || bn.postMessage(e);
      })),
      "undefined" != typeof addEventListener &&
        (addEventListener("pagehide", function (e) {
          if (!dn.disableBfCache && e.persisted) {
            (fe && console.debug("Dexie: handling persisted pagehide"),
              null == bn || bn.close());
            for (var t = 0, r = vt; t < r.length; t++) {
              r[t].close({ disableAutoOpen: !1 });
            }
          }
        }),
        addEventListener("pageshow", function (e) {
          !dn.disableBfCache &&
            e.persisted &&
            (fe && console.debug("Dexie: handling persisted pageshow"),
            En(),
            mn({ all: new Rr(-1 / 0, [[]]) }));
        })),
      (Fe.rejectionMapper = function (e, t) {
        if (
          !e ||
          e instanceof V ||
          e instanceof TypeError ||
          e instanceof SyntaxError ||
          !e.name ||
          !ee[e.name]
        )
          return e;
        var r = new ee[e.name](t || e.message, e);
        return (
          "stack" in e &&
            g(r, "stack", {
              get: function () {
                return this.inner.stack;
              },
            }),
          r
        );
      }),
      pe(fe));
  }),
  i.register("k24II", function (t, r) {
    e(t.exports, "default", () => s);
    var n = i("hRqrj"),
      o = i("2xkva");
    const a = "__fpga4delayed";
    const u = {
      pageview: ({ page_location: e, page_title: t } = {}) => {
        ((t = t || document.title),
          (e = e || window.location.href).startsWith("/") &&
            (e = `${window.location.protocol}//${window.location.host}${e}`));
        try {
          const t = new URL(e);
          t.searchParams.get("url") &&
            (t.searchParams.delete("url"), (e = t.toString()));
        } catch (e) {
          o.default.error(e);
        }
        n.Analytics.firePageViewEvent({ page_title: t, page_location: e });
      },
      event: ({ name: e, params: t }) =>
        n.Analytics.fireEvent({ name: e, params: t }),
      delayedEvent: ({ name: e, params: t }) => {
        const r = JSON.stringify({ name: e, params: t });
        try {
          window.localStorage.setItem(a, r);
        } catch (e) {
          o.default.error(e);
        }
      },
      _runDelayedEvent: () => {
        let e;
        try {
          ((e = window.localStorage.getItem(a)),
            e && window.localStorage.removeItem(a));
        } catch (e) {
          o.default.error(e);
        }
        e && u.event(e);
      },
    };
    u._runDelayedEvent();
    var s = u;
  }),
  i.register("hRqrj", function (t, r) {
    e(t.exports, "Analytics", () => n);
    const n = new (class {
      async getOrCreateClientId() {
        let { clientId: e } = await chrome.storage.local.get("clientId");
        return (
          e ||
            ((e = self.crypto.randomUUID()),
            await chrome.storage.local.set({ clientId: e })),
          e
        );
      }
      async getOrCreateSessionId() {
        let { sessionData: e } =
          await chrome.storage.session.get("sessionData");
        const t = Date.now();
        if (e && e.timestamp) {
          (t - e.timestamp) / 6e4 > 30
            ? (e = null)
            : ((e.timestamp = t),
              await chrome.storage.session.set({ sessionData: e }));
        }
        return (
          e ||
            ((e = { session_id: t.toString(), timestamp: t.toString() }),
            await chrome.storage.session.set({ sessionData: e })),
          e.session_id
        );
      }
      async fireEvent({ name: e, params: t = {} }) {
        (t.session_id || (t.session_id = await this.getOrCreateSessionId()),
          t.engagement_time_msec || (t.engagement_time_msec = 100));
        try {
          const r = await fetch(
            (this.debug
              ? "http://localhost:3456/debug/mp/collect"
              : "https://www.google-analytics.com/mp/collect") +
              "?measurement_id=G-R8FSS9S0K5&api_secret=-yfjGs_8R5aQ0XizTB1Xrg",
            {
              method: "POST",
              body: JSON.stringify({
                client_id: await this.getOrCreateClientId(),
                events: [{ name: e, params: t }],
              }),
            },
          );
          if (!this.debug) return;
          console.log(await r.text());
        } catch (e) {
          console.error("Google Analytics request failed with an exception", e);
        }
      }
      async firePageViewEvent({
        page_title: e,
        page_location: t,
        params: r = {},
      }) {
        return this.fireEvent({
          name: "page_view",
          params: { page_title: e, page_location: t, ...r },
        });
      }
      async fireErrorEvent(e, t = {}) {
        return this.fireEvent({
          name: "extension_error",
          params: { ...e, ...t },
        });
      }
      constructor(e = !1) {
        this.debug = e;
      }
    })(!1);
  }),
  i.register("gstfn", function (t, r) {
    (e(t.exports, "canvasToBlob", () => o),
      e(t.exports, "blobToUrl", () => a),
      e(t.exports, "revokeObjectUrl", () => u));
    var n = i("2xkva");
    async function o(e, t, r) {
      return (
        (t = t || "image/png"),
        (r = r || 1),
        window.HTMLCanvasElement && HTMLCanvasElement.prototype.toBlob
          ? new Promise((n) => e.toBlob((e) => n(e), t, r))
          : new Promise((n) => {
              n(
                (function (e) {
                  let t = atob(e.split(",")[1]),
                    r = e.split(",")[0].split(":")[1].split(";")[0];
                  return (function (e, t) {
                    let r = new ArrayBuffer(e.length),
                      n = new Uint8Array(r),
                      o = e.length;
                    for (; o--;) n[o] = e.charCodeAt(o);
                    let i = new Blob([r], { type: t });
                    return i;
                  })(t, r);
                })(e.toDataURL(t, r)),
              );
            })
      );
    }
    function a(e) {
      return URL.createObjectURL(e);
    }
    function u(e) {
      if (e && URL.revokeObjectURL)
        try {
          URL.revokeObjectURL(e);
        } catch (e) {
          (n.default.error("Unable to revoke object URL"), n.default.error(e));
        }
    }
  }),
  i.register("8P88O", function (t, r) {
    (e(t.exports, "trigger", () => i),
      e(t.exports, "on", () => a),
      e(t.exports, "off", () => u),
      e(t.exports, "oncePromise", () => s));
    const n = {},
      o = {},
      i = (e, t) => {
        ([n, o].forEach((r) => c(r, e, []).forEach((e) => e(t))), (o[e] = []));
      },
      a = (e, t) => {
        c(n, e, []).push(t);
      },
      u = (e, t) => {
        const r = n[e];
        r && (n[e] = r.filter((e) => e !== t));
      },
      s = (e) =>
        new Promise((t) => {
          c(o, e, []).push(t);
        }),
      c = (e, t, r) => (void 0 === e[t] && (e[t] = r), e[t]);
  }));
//# sourceMappingURL=popup_core.js.map
