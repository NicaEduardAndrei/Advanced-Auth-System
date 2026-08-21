import crypto from "crypto";


export function generateOtp() {
    const code = crypto.randomInt(100000, 1000000).toString();
    return code;
}

export function hashOtp(code) {

    const hash = crypto.createHash("sha256").update(code).digest("hex");
    return hash;
}

export function verifyOtp(code, hashedCode) {

    if (hashOtp(code) === hashedCode) {
        return true
    } else {
        return false
    }
}