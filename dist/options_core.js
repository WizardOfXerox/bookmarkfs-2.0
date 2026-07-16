function e(e, t, n, r) {
  Object.defineProperty(e, t, {
    get: n,
    set: r,
    enumerable: !0,
    configurable: !0,
  });
}
var t =
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
  r = {},
  a = t.parcelRequire60cc;
(null == a &&
  (((a = function (e) {
    if (e in n) return n[e].exports;
    if (e in r) {
      var t = r[e];
      delete r[e];
      var a = { id: e, exports: {} };
      return ((n[e] = a), t.call(a.exports, a, a.exports), a.exports);
    }
    var s = new Error("Cannot find module '" + e + "'");
    throw ((s.code = "MODULE_NOT_FOUND"), s);
  }).register = function (e, t) {
    r[e] = t;
  }),
  (t.parcelRequire60cc = a)),
  a.register("6S5q7", function (t, n) {
    (e(t.exports, "getUrls", () => s), e(t.exports, "setUrl", () => o));
    var r = a("03QYZ");
    const s = () => {
        const e = (0, r.getQueryString)(),
          t = e.id || e.oid,
          n = e.e,
          a = e.url;
        return {
          options: d(t, n, a),
          history: u(t, n, a),
          capture: t ? i(t, a) : void 0,
          editor: t && n ? l(t, n, a) : void 0,
        };
      },
      o = (e, t, n = !1) => {
        if (e) {
          -1 === e.href.indexOf("?") &&
            ((e.href = t), n && e.setAttribute("style", ""));
        }
      },
      i = (e, t = null) => {
        const n = { id: e };
        t && (n.url = t);
        return "/dist/capture.html" + ("?" + (0, r.toQueryString)(n));
      },
      l = (e, t, n = null) => {
        const a = { id: e, e: t };
        n && (a.url = n);
        return "/dist/editor.html" + ("?" + (0, r.toQueryString)(a));
      },
      d = (e = null, t = null, n = null) => {
        let a = "";
        if (e) {
          const s = { id: e };
          (t && (s.e = t),
            n && (s.url = n),
            (a = "?" + (0, r.toQueryString)(s)));
        }
        return "/dist/options.html" + a;
      },
      u = (e = null, t = null, n = null) => {
        let a = "";
        if (e) {
          const s = { oid: e };
          (t && (s.e = t),
            n && (s.url = n),
            (a = "?" + (0, r.toQueryString)(s)));
        }
        return "/dist/capture.html" + a;
      };
  }),
  a.register("loK1Y", function (t, n) {
    (e(t.exports, "BACKSPACE", () => s),
      e(t.exports, "RETURN", () => o),
      e(t.exports, "ALT", () => i),
      e(t.exports, "ESC", () => l),
      e(t.exports, "SPACE", () => d),
      e(t.exports, "LEFT", () => u),
      e(t.exports, "UP", () => c),
      e(t.exports, "RIGHT", () => p),
      e(t.exports, "DOWN", () => h),
      e(t.exports, "DELETE", () => f),
      e(t.exports, "NUM0", () => m),
      e(t.exports, "A", () => g),
      e(t.exports, "C", () => y),
      e(t.exports, "D", () => v),
      e(t.exports, "E", () => S),
      e(t.exports, "P", () => _),
      e(t.exports, "S", () => w),
      e(t.exports, "U", () => b),
      e(t.exports, "V", () => x),
      e(t.exports, "Y", () => E),
      e(t.exports, "Z", () => A),
      e(t.exports, "PLUS", () => U),
      e(t.exports, "MINUS", () => O),
      e(t.exports, "SLASH", () => L),
      e(t.exports, "asKeyboardShortcut", () => T),
      e(t.exports, "checkCtrlLike", () => k),
      e(t.exports, "checkRightClick", () => D));
    var r = a("a5i9T");
    const s = 8,
      o = 13,
      i = 18,
      l = 27,
      d = 32,
      u = 37,
      c = 38,
      p = 39,
      h = 40,
      f = 46,
      m = 48,
      g = 65,
      y = 67,
      v = 68,
      S = 69,
      _ = 80,
      w = 83,
      b = 85,
      x = 86,
      E = 89,
      A = 90,
      U = 187,
      O = 189,
      L = 191,
      T = ({ cmd: e, ctrl: t, alt: n, shift: a, char: s }) => {
        const o = (0, r.getIsMac)(),
          i = [];
        return (
          e && i.push(o ? "⌘" : "⌃"),
          t && i.push("⌃"),
          n && i.push("⌥"),
          a && i.push("⇧"),
          i.push(s),
          i.join("")
        );
      },
      k = (e) => ((0, r.getIsMac)() ? e.metaKey : e.ctrlKey),
      D = (e) =>
        "which" in e ? 3 === e.which : "button" in e && 2 === e.button;
  }),
  a.register("cW7yT", function (e, t) {
    /*!
  Copyright (c) 2017 Jed Watson.
  Licensed under the MIT License (MIT), see
  http://jedwatson.github.io/classnames
*/ !(function () {
      var t = {}.hasOwnProperty;
      function n() {
        for (var e = [], r = 0; r < arguments.length; r++) {
          var a = arguments[r];
          if (a) {
            var s = typeof a;
            if ("string" === s || "number" === s) e.push(a);
            else if (Array.isArray(a) && a.length) {
              var o = n.apply(null, a);
              o && e.push(o);
            } else if ("object" === s)
              for (var i in a) t.call(a, i) && a[i] && e.push(i);
          }
        }
        return e.join(" ");
      }
      e.exports
        ? ((n.default = n), (e.exports = n))
        : "function" == typeof define &&
            "object" == typeof define.amd &&
            define.amd
          ? define("classnames", [], function () {
              return n;
            })
          : (window.classNames = n);
    })();
  }),
  a.register("epmSf", function (t, n) {
    (e(t.exports, "STRIPE_SUBSCRIPTION_STATUS", () => i),
      e(t.exports, "objectIsLoginData", () => l),
      e(t.exports, "default", () => c));
    var r = a("jmw9X"),
      s = a("4Bfs2"),
      o = a("dk7YQ");
    const i = [
      "active",
      "trialing",
      "past_due",
      "canceled",
      "unpaid",
      "incomplete",
      "incomplete_expired",
    ];
    function l(e) {
      if (e && "object" == typeof e) {
        const t = e;
        if (
          t.userId &&
          (0, s.isPresent)(t.expires) &&
          (0, s.isPresent)(t.status) &&
          d(t.sub_created) &&
          d(t.expires) &&
          ("" === t.status || i.includes(t.status))
        )
          return !0;
      }
      return !1;
    }
    function d(e) {
      return (0, s.isBlank)(e) || "number" == typeof e;
    }
    const u = new (0, o.default)("user", {
      rejected_dl: { type: "bool", default: !1 },
      login_data: { type: "json", default: () => ({}) },
      ab: { type: "json", default: () => ({}) },
      show_editor_tour: { type: "bool", default: !0 },
      has_logged_in: { type: "bool", default: !1 },
      last_dl_type: { type: "string", default: r.DL_TYPE_IMAGE },
      ab_req_token: { type: "string" },
      show_experimental: { type: "bool", default: !1 },
    });
    var c = u;
    window._showTour = () => u.remove("show_editor_tour");
  }),
  a.register("83PZf", function (t, n) {
    (e(t.exports, "default", () => p), e(t.exports, "resetUser", () => h));
    var r = a("aQWOf"),
      s = a("aIWoc"),
      o = a("35XHW"),
      i = a("jmw9X"),
      l = a("2xkva"),
      d = a("epmSf");
    const u = {
        "": o.SUB_BAD,
        trialing: o.SUB_OK,
        active: o.SUB_OK,
        past_due: o.SUB_NEEDS_UPDATE,
        canceled: o.SUB_BAD,
        unpaid: o.SUB_NEEDS_UPDATE,
      },
      c = (e, ...t) =>
        (0, l.default)(
          `%c[\\\\USER//] ${e}`,
          "color: #0B3;background:#EEFFF3",
          ...t,
        );
    var p = new (class {
      addListener(e) {
        this._listeners.push(e);
      }
      removeListener(e) {
        this._listeners = this._listeners.filter((t) => t !== e);
      }
      async loginStateProm(e) {
        return {
          email: "premium-user@bookmarkfs.local",
          userId: "mock-premium-user",
          premium: true,
          status: "active",
          subState: "sub-ok",
          updated: 1783818635,
          expires: 2099999999,
          store: {},
        };
        c(`loginStateProm(${JSON.stringify(e)})`);
        const t = await d.default.load();
        (c("got items"), (0, l.default)(t));
        let n = this._asLoginState(t.login_data, t);
        if ((c("converted data:"), (0, l.default)(n), n.subState === o.SUB_BAD))
          return (c(`BAD SUBSTATE ${n.subState}`), n);
        const a = r.DateTime.now().diff(n.updated, "days").days;
        if ((c(`days since: ${a}`), e && a >= 31 && navigator.onLine)) {
          let e;
          try {
            (c("do extra login!!!!"),
              (e = await this._login()),
              c("got data!!!!"),
              (0, l.default)(e));
          } catch (e) {
            throw (l.default.error("Error logging in!"), e);
          }
          e && (n = this._asLoginState(e, t));
        }
        return (c("RETURNING DATA!!!"), (0, l.default)(n), n);
      }
      async setWebsiteABState() {
        c("[User.setWebsiteABState] start");
        const e = await d.default.load(),
          t = e.ab;
        if ("{}" === JSON.stringify(t)) return !0;
        const n = e.login_data,
          r = !(!n || !n.userId),
          a = Object.assign({ hasUser: r }, t),
          s = JSON.stringify(a),
          o = await this._getHandshake();
        (o.call("setAbJson", s), c("[User.setWebsiteABState] did setAbJson"));
        let i = 2,
          u = null;
        for (; i > 0;) {
          i--;
          let e = await o.get("getAbJson");
          c(`[User.setWebsiteABState] did getAbJson: ${e}`);
          try {
            u = JSON.parse(e);
          } catch (e) {
            (c("[User -> postmate.getAbJson -> JSON.parse]"),
              l.default.error(e));
            continue;
          }
          if (u && "object" == typeof u) break;
          (c(`[User -> postmate.getAbJson -> object] not object! ${u}`),
            (u = null));
        }
        u = u || {};
        const p = Object.keys(a).every((e) => e in u);
        return (
          c(`[User.setWebsiteABState] isSet? ${p}: ${JSON.stringify(u)}`),
          p
        );
      }
      _asLoginState(e, t) {
        (c("[User._asLoginState]", e, t),
          (e && "object" == typeof e) || l.default.error("INVALID DATA", e));
        const n = Object.assign({}, e);
        (["expires", "updated"].forEach(
          (e) => (n[e] = r.DateTime.fromSeconds(n[e] || 0)),
        ),
          (n.status = n.status || o.STATUS_NONE));
        const a = r.DateTime.now();
        (!n.userId || a > n.expires) && (n.status = o.STATUS_NONE);
        let s = u[n.status];
        return ((n.subState = s), (n.store = t), n);
      }
      _getHandshake() {
        return (
          this._handshake ||
            (this._handshake = new (0, s.default)({
              container: document.body,
              url: i.WEBCOMM_URL,
              classListArray: ["h"],
            })),
          this._handshake
        );
      }
      async _login() {
        const e = await this._getHandshake(),
          t = await e.get("authState");
        return (
          (0, l.default)("[PARENT] authState", t),
          await this.storeLoginData(t),
          t
        );
      }
      storeLoginData(e) {
        c("[User.storeLoginData]", e);
        let t = e && e.show_experimental;
        (null != t &&
          (delete e.show_experimental, "boolean" != typeof t && (t = null)),
          (e.updated = Math.floor(r.DateTime.now().toSeconds())));
        const n = { login_data: e };
        return (
          e.userId && (n.has_logged_in = !0),
          null != t && (n.show_experimental = t),
          d.default.setObj(n)
        );
      }
      constructor() {
        ((this._listeners = []),
          d.default.onUpdate((e) => {
            (c(`Updated names: ${JSON.stringify(e)}`),
              this.loginStateProm()
                .then((e) => {
                  this._listeners.forEach((t) => t(e));
                })
                .catch((e) => {
                  (c("Error loading subscription state!"), l.default.error(e));
                }));
          }));
      }
    })();
    const h = () => d.default.set("login_data", {});
  }),
  a.register("aIWoc", function (t, n) {
    e(t.exports, "default", () => u);
    /**
  postmate - A powerful, simple, promise-based postMessage library
  @version v1.5.2
  @link https://github.com/dollarshaveclub/postmate
  @author Jacob Kelley <jakie8@gmail.com>
  @license MIT
**/
    var r = "application/x-postmate-v1+json",
      a = 0,
      s = {
        handshake: 1,
        "handshake-reply": 1,
        call: 1,
        emit: 1,
        reply: 1,
        request: 1,
      },
      o = function (e, t) {
        return (
          ("string" != typeof t || e.origin === t) &&
          !!e.data &&
          ("object" != typeof e.data || "postmate" in e.data) &&
          e.data.type === r &&
          !!s[e.data.postmate]
        );
      },
      i = (function () {
        function e(e) {
          var t = this;
          ((this.parent = e.parent),
            (this.frame = e.frame),
            (this.child = e.child),
            (this.childOrigin = e.childOrigin),
            (this.events = {}),
            (this.listener = function (e) {
              if (!o(e, t.childOrigin)) return !1;
              var n = ((e || {}).data || {}).value || {},
                r = n.data,
                a = n.name;
              "emit" === e.data.postmate &&
                a in t.events &&
                t.events[a].call(t, r);
            }),
            this.parent.addEventListener("message", this.listener, !1));
        }
        var t = e.prototype;
        return (
          (t.get = function (e) {
            var t = this;
            return new d.Promise(function (n) {
              var s = ++a;
              (t.parent.addEventListener(
                "message",
                function e(r) {
                  r.data.uid === s &&
                    "reply" === r.data.postmate &&
                    (t.parent.removeEventListener("message", e, !1),
                    n(r.data.value));
                },
                !1,
              ),
                t.child.postMessage(
                  { postmate: "request", type: r, property: e, uid: s },
                  t.childOrigin,
                ));
            });
          }),
          (t.call = function (e, t) {
            this.child.postMessage(
              { postmate: "call", type: r, property: e, data: t },
              this.childOrigin,
            );
          }),
          (t.on = function (e, t) {
            this.events[e] = t;
          }),
          (t.destroy = function () {
            (window.removeEventListener("message", this.listener, !1),
              this.frame.parentNode.removeChild(this.frame));
          }),
          e
        );
      })(),
      l = (function () {
        function e(e) {
          var t = this;
          ((this.model = e.model),
            (this.parent = e.parent),
            (this.parentOrigin = e.parentOrigin),
            (this.child = e.child),
            this.child.addEventListener("message", function (e) {
              if (o(e, t.parentOrigin)) {
                var n = e.data,
                  a = n.property,
                  s = n.uid,
                  i = n.data;
                "call" !== e.data.postmate
                  ? (function (e, t) {
                      var n = "function" == typeof e[t] ? e[t]() : e[t];
                      return d.Promise.resolve(n);
                    })(t.model, a).then(function (t) {
                      return e.source.postMessage(
                        {
                          property: a,
                          postmate: "reply",
                          type: r,
                          uid: s,
                          value: t,
                        },
                        e.origin,
                      );
                    })
                  : a in t.model &&
                    "function" == typeof t.model[a] &&
                    t.model[a](i);
              }
            }));
        }
        return (
          (e.prototype.emit = function (e, t) {
            this.parent.postMessage(
              { postmate: "emit", type: r, value: { name: e, data: t } },
              this.parentOrigin,
            );
          }),
          e
        );
      })(),
      d = (function () {
        function e(e) {
          var t = e.container,
            n = void 0 === t ? (void 0 !== n ? n : document.body) : t,
            r = e.model,
            a = e.url,
            s = e.name,
            o = e.classListArray,
            i = void 0 === o ? [] : o;
          return (
            (this.parent = window),
            (this.frame = document.createElement("iframe")),
            (this.frame.name = s || ""),
            this.frame.classList.add.apply(this.frame.classList, i),
            n.appendChild(this.frame),
            (this.child =
              this.frame.contentWindow ||
              this.frame.contentDocument.parentWindow),
            (this.model = r || {}),
            this.sendHandshake(a)
          );
        }
        return (
          (e.prototype.sendHandshake = function (t) {
            var n,
              a = this,
              s = (function (e) {
                var t = document.createElement("a");
                t.href = e;
                var n =
                    t.protocol.length > 4
                      ? t.protocol
                      : window.location.protocol,
                  r = t.host.length
                    ? "80" === t.port || "443" === t.port
                      ? t.hostname
                      : t.host
                    : window.location.host;
                return t.origin || n + "//" + r;
              })(t),
              l = 0;
            return new e.Promise(function (e, d) {
              a.parent.addEventListener(
                "message",
                function t(r) {
                  return (
                    !!o(r, s) &&
                    ("handshake-reply" === r.data.postmate
                      ? (clearInterval(n),
                        a.parent.removeEventListener("message", t, !1),
                        (a.childOrigin = r.origin),
                        e(new i(a)))
                      : d("Failed handshake"))
                  );
                },
                !1,
              );
              var u = function () {
                  (l++,
                    a.child.postMessage(
                      { postmate: "handshake", type: r, model: a.model },
                      s,
                    ),
                    5 === l && clearInterval(n));
                },
                c = function () {
                  (u(), (n = setInterval(u, 500)));
                };
              (a.frame.attachEvent
                ? a.frame.attachEvent("onload", c)
                : (a.frame.onload = c),
                (a.frame.src = t));
            });
          }),
          e
        );
      })();
    ((d.debug = !1),
      (d.Promise = (function () {
        try {
          return window ? window.Promise : Promise;
        } catch (e) {
          return null;
        }
      })()),
      (d.Model = (function () {
        function e(e) {
          return (
            (this.child = window),
            (this.model = e),
            (this.parent = this.child.parent),
            this.sendHandshakeReply()
          );
        }
        return (
          (e.prototype.sendHandshakeReply = function () {
            var e = this;
            return new d.Promise(function (t, n) {
              e.child.addEventListener(
                "message",
                function a(s) {
                  if (s.data.postmate) {
                    if ("handshake" === s.data.postmate) {
                      (e.child.removeEventListener("message", a, !1),
                        s.source.postMessage(
                          { postmate: "handshake-reply", type: r },
                          s.origin,
                        ),
                        (e.parentOrigin = s.origin));
                      var o = s.data.model;
                      return (
                        o &&
                          Object.keys(o).forEach(function (t) {
                            e.model[t] = o[t];
                          }),
                        t(new l(e))
                      );
                    }
                    return n("Handshake Reply Failed");
                  }
                },
                !1,
              );
            });
          }),
          e
        );
      })()));
    var u = d;
  }));
//# sourceMappingURL=options_core.js.map
