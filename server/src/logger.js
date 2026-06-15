const UAParser = require('ua-parser-js');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
};

const ICONS = {
  info: `${COLORS.blue}ℹ${COLORS.reset}`,
  success: `${COLORS.green}✔${COLORS.reset}`,
  warn: `${COLORS.yellow}⚠${COLORS.reset}`,
  error: `${COLORS.red}✖${COLORS.reset}`,
  auth: `${COLORS.magenta}🔐${COLORS.reset}`,
  room: `${COLORS.cyan}🏠${COLORS.reset}`,
  game: `${COLORS.yellow}🎮${COLORS.reset}`,
  socket: `${COLORS.blue}🔌${COLORS.reset}`,
  night: `${COLORS.magenta}🌙${COLORS.reset}`,
  day: `${COLORS.yellow}☀️${COLORS.reset}`,
  kill: `${COLORS.red}💀${COLORS.reset}`,
  vote: `${COLORS.cyan}🗳️${COLORS.reset}`,
  heal: `${COLORS.green}💊${COLORS.reset}`,
  check: `${COLORS.blue}🔍${COLORS.reset}`,
  admin: `${COLORS.bgRed}👑${COLORS.reset}`,
  db: `${COLORS.gray}🗄️${COLORS.reset}`,
  http: `${COLORS.white}📡${COLORS.reset}`,
};

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function parseUA(req) {
  const ua = req.headers['user-agent'] || '';
  const parser = new UAParser(ua);
  const result = parser.getResult();
  return {
    browser: `${result.browser.name || '?'} ${result.browser.version || ''}`.trim(),
    os: `${result.os.name || '?'} ${result.os.version || ''}`.trim(),
    device: result.device.type || 'desktop'
  };
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.socket?.remoteAddress ||
         'unknown';
}

function log(type, icon, message, meta = {}) {
  const ts = timestamp();
  const metaStr = Object.keys(meta).length > 0
    ? `${COLORS.gray} ${JSON.stringify(meta)}${COLORS.reset}`
    : '';
  console.log(`${COLORS.gray}[${ts}]${COLORS.reset} ${icon} ${message}${metaStr}`);
}

module.exports = {
  COLORS, ICONS, timestamp, parseUA, getClientIP, log,

  httpRequest: (req, res) => {
    const ip = getClientIP(req);
    const ua = parseUA(req);
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const statusColor = res.statusCode >= 400 ? COLORS.red : COLORS.green;
      log('http', ICONS.http,
        `${req.method} ${req.originalUrl} → ${statusColor}${res.statusCode}${COLORS.reset} ${COLORS.gray}(${duration}ms)${COLORS.reset}`,
        { ip, browser: ua.browser, os: ua.os }
      );
    });
  },

  socketConnect: (socket, req) => {
    const ip = getClientIP(req);
    const ua = parseUA(req);
    log('socket', ICONS.socket,
      `CONNECT ${COLORS.green}${socket.user.nickname}${COLORS.reset} [${socket.id}]`,
      { ip, browser: ua.browser, os: ua.os, device: ua.device }
    );
  },

  socketDisconnect: (socket, reason) => {
    log('socket', ICONS.socket,
      `DISCONNECT ${COLORS.red}${socket.user.nickname}${COLORS.reset} [${socket.id}] reason: ${reason}`
    );
  },

  auth: {
    register: (nickname, ip) => {
      log('auth', ICONS.auth,
        `REGISTER ${COLORS.green}${nickname}${COLORS.reset}`,
        { ip }
      );
    },
    login: (nickname, ip) => {
      log('auth', ICONS.auth,
        `LOGIN ${COLORS.green}${nickname}${COLORS.reset}`,
        { ip }
      );
    },
    loginFailed: (login, reason, ip) => {
      log('auth', ICONS.error,
        `LOGIN FAILED ${COLORS.red}${login}${COLORS.reset} — ${reason}`,
        { ip }
      );
    },
    banned: (login, ip) => {
      log('auth', ICONS.warn,
        `BANNED LOGIN ATTEMPT ${COLORS.red}${login}${COLORS.reset}`,
        { ip }
      );
    },
    adminAction: (admin, action, target, ip) => {
      log('auth', ICONS.admin,
        `ADMIN ${COLORS.green}${admin}${COLORS.reset} → ${action} ${COLORS.red}${target}${COLORS.reset}`,
        { ip }
      );
    }
  },

  room: {
    create: (host, roomId, name, settings) => {
      log('room', ICONS.room,
        `CREATE room ${COLORS.cyan}#${roomId}${COLORS.reset} "${name}" by ${COLORS.green}${host}${COLORS.reset}`,
        { maxPlayers: settings.maxPlayers, mafia: settings.mafiaCount, commissioner: settings.commissionerCount, doctor: settings.doctorCount }
      );
    },
    join: (nickname, roomId) => {
      log('room', ICONS.room,
        `JOIN ${COLORS.green}${nickname}${COLORS.reset} → room ${COLORS.cyan}#${roomId}${COLORS.reset}`
      );
    },
    rejoin: (nickname, roomId) => {
      log('room', ICONS.room,
        `REJOIN ${COLORS.yellow}${nickname}${COLORS.reset} → room ${COLORS.cyan}#${roomId}${COLORS.reset}`
      );
    },
    leave: (nickname, roomId) => {
      log('room', ICONS.room,
        `LEAVE ${COLORS.red}${nickname}${COLORS.reset} ← room ${COLORS.cyan}#${roomId}${COLORS.reset}`
      );
    },
    delete: (roomId) => {
      log('room', ICONS.room,
        `DELETE room ${COLORS.red}#${roomId}${COLORS.reset}`
      );
    }
  },

  game: {
    start: (roomId, playerCount, roles) => {
      const roleSummary = {};
      roles.forEach(r => { roleSummary[r] = (roleSummary[r] || 0) + 1; });
      log('game', ICONS.game,
        `START room ${COLORS.cyan}#${roomId}${COLORS.reset} — ${playerCount} players`,
        { roles: roleSummary }
      );
    },
    phaseChange: (roomId, phase, dayNumber) => {
      const icon = phase === 'night' ? ICONS.night : ICONS.day;
      log('game', icon,
        `PHASE room ${COLORS.cyan}#${roomId}${COLORS.reset} → ${phase === 'night' ? '🌙 NIGHT' : '☀️ DAY'} #${dayNumber}`
      );
    },
    mafiaKill: (nickname, target, roomId) => {
      log('game', ICONS.kill,
        `MAFIA KILL ${COLORS.red}${nickname}${COLORS.reset} targets ${COLORS.red}${target}${COLORS.reset} in room ${COLORS.cyan}#${roomId}${COLORS.reset}`
      );
    },
    commissionerCheck: (nickname, target, isMafia, roomId) => {
      const result = isMafia ? `${COLORS.red}mafia✓${COLORS.reset}` : `${COLORS.green}not mafia${COLORS.reset}`;
      log('game', ICONS.check,
        `CHECK ${COLORS.blue}${nickname}${COLORS.reset} checks ${COLORS.yellow}${target}${COLORS.reset} → ${result} in room ${COLORS.cyan}#${roomId}${COLORS.reset}`
      );
    },
    doctorHeal: (nickname, target, roomId) => {
      log('game', ICONS.heal,
        `HEAL ${COLORS.green}${nickname}${COLORS.reset} heals ${COLORS.green}${target}${COLORS.reset} in room ${COLORS.cyan}#${roomId}${COLORS.reset}`
      );
    },
    vote: (voter, target, roomId) => {
      log('game', ICONS.vote,
        `VOTE ${COLORS.cyan}${voter}${COLORS.reset} → ${target ? COLORS.red + target + COLORS.reset : 'abstain'} in room ${COLORS.cyan}#${roomId}${COLORS.reset}`
      );
    },
    nightResult: (roomId, killed, healed) => {
      if (killed) {
        log('game', ICONS.kill,
          `NIGHT RESULT room ${COLORS.cyan}#${roomId}${COLORS.reset}: ${COLORS.red}${killed} KILLED${COLORS.reset}`
        );
      } else if (healed) {
        log('game', ICONS.heal,
          `NIGHT RESULT room ${COLORS.cyan}#${roomId}${COLORS.reset}: ${COLORS.green}Player SAVED by doctor${COLORS.reset}`
        );
      } else {
        log('game', ICONS.success,
          `NIGHT RESULT room ${COLORS.cyan}#${roomId}${COLORS.reset}: ${COLORS.green}No kills${COLORS.reset}`
        );
      }
    },
    voteResult: (roomId, eliminated, tie) => {
      if (tie) {
        log('game', ICONS.warn,
          `VOTE RESULT room ${COLORS.cyan}#${roomId}${COLORS.reset}: ${COLORS.yellow}TIE — no elimination${COLORS.reset}`
        );
      } else if (eliminated) {
        log('game', ICONS.kill,
          `VOTE RESULT room ${COLORS.cyan}#${roomId}${COLORS.reset}: ${COLORS.red}${eliminated} ELIMINATED${COLORS.reset}`
        );
      } else {
        log('game', ICONS.success,
          `VOTE RESULT room ${COLORS.cyan}#${roomId}${COLORS.reset}: ${COLORS.green}No elimination${COLORS.reset}`
        );
      }
    },
    end: (roomId, winner) => {
      const color = winner === 'town' ? COLORS.green : COLORS.red;
      const name = winner === 'town' ? 'TOWN WINS' : 'MAFIA WINS';
      log('game', ICONS.game,
        `GAME OVER room ${COLORS.cyan}#${roomId}${COLORS.reset}: ${color}${name}${COLORS.reset}`
      );
    }
  },

  db: {
    query: (text, duration) => {
      log('db', ICONS.db, `${COLORS.gray}${text}${COLORS.reset} ${COLORS.gray}(${duration}ms)${COLORS.reset}`);
    }
  }
};
