import BN from "bn.js";
import { hash as sha256 } from "@stablelib/sha256";

const ZERO     = new BN(0);
const ONE      = new BN(1);
const TWO      = new BN(2);
const THREE    = new BN(3);
const FOUR     = new BN(4);
const EIGHT    = new BN(8);
const INFINITY = [ ONE, ONE, ZERO ];

const EC_P224_A = new BN("fffffffffffffffffffffffffffffffefffffffffffffffffffffffe", 16);
const EC_P224_B = new BN("b4050a850c04b3abf54132565044b0b7d7bfd8ba270b39432355ffb4", 16);
const EC_P224_P = new BN("ffffffffffffffffffffffffffffffff000000000000000000000001", 16);
const EC_P224_G = [ new BN("b70e0cbd6bb4bf7f321390b94a03c1d356c21122343280d6115c1d21", 16), new BN("bd376388b5f723fb4c22dfe6cd4375a05a07476444d5819985007e34", 16) ];

const KM = [ new BN("4d48c8ea8d23392e07e851fa6aa82048094e051372499c6fba62a74b", 16), new BN("6c185cabd52e2e8a9e2d21b0ec4ee141211fe29d64ea4d04463ae833", 16) ];
const KN = [ new BN("0b1cfc6a407cdcb15dc1704cd13edaab8fdeff8cfbfb50d2c81de2c2", 16), new BN("3e14f62996080907b56dd282071aa7a121c39934bc30da5bcbc6a3cc", 16) ];

const POINT_SIZE_BITS = 224;

/**
 * @param   {Number} n
 * @returns {BN[][]}
 */
function generatePrecomp(n) {
	const precomp = new Array(n);

	for(let i = 0; i < precomp.length; i++) {
		precomp[i] = [ new BN(0), new BN(0), new BN(0) ];
	}

	return precomp;
}

export default class SpakeP224 {
	#password_hash;
	#is_client;
	#value_x;
	#point_x;

	/**
	 * @param {String}     password
	 * @param {Boolean}    is_client
	 * @param {Uint8Array} value_x
	 */
	constructor(password, is_client = true, value_x = crypto.getRandomValues(new Uint8Array(28))) {
		this.#password_hash = new BN(sha256((new TextEncoder()).encode(password)).slice(0, 28));
		this.#is_client     = is_client;
		this.#value_x       = new BN(value_x);
		this.#point_x       = SpakeP224.validateEcP224CurvePointAffine(SpakeP224.scalarMultiplyAffinePoint(EC_P224_G, this.#value_x));
	}

	/**
	 * @param   {BN[]} p
	 * @param   {BN} k
	 * @returns {BN[]}
	 */
	static scalarMultiplyAffinePoint(p, k) {
		return this.toAffine(this.scalarMultiplyJacobianPoint(this.toJacobian(p), k));
	}

	/**
	 * @param   {BN[]} p1
	 * @param   {BN[]} p2
	 * @returns {BN[]}
	 */
	static subtractAffinePoint(p1, p2) {
		return this.toAffine(this.subtractJacobianPoints(this.toJacobian(p1), this.toJacobian(p2)));
	}

	/**
	 * @param   {BN[]} p1
	 * @param   {BN[]} p2
	 * @returns {BN[]}
	 */
	static addAffinePoints(p1, p2) {
		return this.toAffine(this.addJacobianPoints(this.toJacobian(p1), this.toJacobian(p2)));
	}

	/**
	 * @param   {BN[]} jacobian_point
	 * @returns {BN[]}
	 */
	static toAffine(jacobian_point) {
		if(jacobian_point.length !== 3) {
			throw new Error("Length of jacobian point must be 3");
		}

		if(jacobian_point[2].eq(ZERO)) {
			throw new Error("Cannot affinify point at infinity");
		}

		return [
			jacobian_point[0].mul(jacobian_point[2].pow(TWO).invm(EC_P224_P)).umod(EC_P224_P),
			jacobian_point[1].mul(jacobian_point[2].pow(THREE).invm(EC_P224_P)).umod(EC_P224_P),
		];
	}

	/**
	 * @param   {BN[]} affine_point
	 * @returns {BN[]}
	 */
	static toJacobian(affine_point) {
		if(affine_point.length !== 2) {
			throw new Error("Length of affine point must be 2");
		}

		return [ affine_point[0], affine_point[1], ONE ];
	}

	/**
	 * @param   {BN[]} point
	 * @returns {BN[]}
	 */
	static doubleJacobianPoint(point) {
		if(point.length !== 3) {
			throw new Error("Length of point must be 3");
		}

		if(point[0] == null || point[1] == null || point[2] == null) {
			return point;
		}

		if(point[2].eq(ZERO)) {
			return INFINITY;
		}

		const delta = point[2].pow(TWO).umod(EC_P224_P);
		const gamma = point[1].pow(TWO).umod(EC_P224_P);
		const beta  = point[0].mul(gamma).umod(EC_P224_P);
		const alpha = THREE.mul(point[0].sub(delta)).mul(point[0].add(delta)).umod(EC_P224_P);

		const x3 = alpha.pow(TWO).sub(EIGHT.mul(beta)).umod(EC_P224_P);
		const y3 = alpha.mul(FOUR.mul(beta).sub(x3)).sub(EIGHT.mul(gamma.pow(TWO))).umod(EC_P224_P);
		const z3 = point[1].add(point[2]).pow(TWO).sub(gamma).sub(delta).umod(EC_P224_P);

		return [ x3, y3, z3 ];
	}

	/**
	 * @param   {BN[]} point1
	 * @param   {BN[]} point2
	 * @returns {BN[]}
	 */
	static addJacobianPoints(point1, point2) {
		// Check if point 1 is at Z = 0
		if (point1[0] == null || point1[1] == null || point1[2] == null || point1[2].eq(ZERO)) {
			return point2;
		}

		// Check if point 2 is at Z = 0
		if (point2[0] == null || point2[1] == null || point2[2] == null || point2[2].eq(ZERO)) {
			return point1;
		}

		const z1z1 = point1[2].pow(TWO).umod(EC_P224_P);
		const z2z2 = point2[2].pow(TWO).umod(EC_P224_P);
		const u1   = point1[0].mul(z2z2).umod(EC_P224_P);
		const u2   = point2[0].mul(z1z1).umod(EC_P224_P);
		const s1   = point1[1].mul(point2[2]).mul(z2z2).umod(EC_P224_P);
		const s2   = point2[1].mul(point1[2]).mul(z1z1).umod(EC_P224_P);

		if (u1.eq(u2) && s1.eq(s2)) {
			throw new Error("Cannot subtract two equal points");
		}

		const h = u2.sub(u1).umod(EC_P224_P);
		const i = TWO.mul(h).pow(TWO).umod(EC_P224_P);
		const j = h.mul(i).umod(EC_P224_P);
		const r = TWO.mul(s2.sub(s1)).umod(EC_P224_P);
		const v = u1.mul(i).umod(EC_P224_P);

		const x3 = r.pow(TWO).sub(j).sub(TWO.mul(v)).umod(EC_P224_P);
		const y3 = r.mul(v.sub(x3)).sub(TWO.mul(s1).mul(j)).umod(EC_P224_P);
		const z3 = point1[2].add(point2[2]).pow(TWO).sub(z1z1).sub(z2z2).mul(h).umod(EC_P224_P);

		return [ x3, y3, z3 ];
	}

	/**
	 * @param   {BN[]} point1
	 * @param   {BN[]} point2
	 * @returns {BN[]}
	 */
	static subtractJacobianPoints(point1, point2) {
		return this.addJacobianPoints(point1, [ point2[0], point2[1].neg(), point2[2] ]);
	}

	/**
	 * @param   {BN[]} p
	 * @param   {BN}   k
	 * @returns {BN[]}
	 */
	static scalarMultiplyJacobianPoint(p, k) {
		if(k.eq(ZERO) || p[2].eq(ZERO)) {
			return INFINITY;
		}

		const precomp = generatePrecomp(POINT_SIZE_BITS);

		precomp[0] = p;

		for (let i = 1; i < POINT_SIZE_BITS; i++) {
			precomp[i] = this.doubleJacobianPoint(precomp[i - 1]);
		}

		let q = [ new BN(0), new BN(0), new BN(0) ];
		let r = [ new BN(0), new BN(0), new BN(0) ];

		for(let i = 0; i < POINT_SIZE_BITS; i++) {
			if(k.testn(i)) {
				q = this.addJacobianPoints(q, precomp[i]);
			}
			else {
				r = this.addJacobianPoints(q, precomp[i]);
			}
		}

		if(r[2].eq(ZERO)) {
			throw new Error("Unexpected zero in scalarMultiplication");
		}

		return q;
	}

	/**
	 * @param   {BN[]} point
	 * @returns {BN[]}
	 */
	static validateEcP224CurvePointAffine(point) {
		if (point === null || point.length !== 2) {
			throw new Error("Point must have x,y coordinates");
		}

		const x = point[0];
		const y = point[1];

		if(x.isNeg() || y.isNeg()) {
			throw new Error("Point encoding must use only positive integers");
		}
		else if(x.cmp(EC_P224_P) >= 0 || y.cmp(EC_P224_P) >= 0) {
			throw new Error("Point lies outside of the expected field");
		}
		else if(!y.mul(y).umod(EC_P224_P).eq(x.mul(x).umod(EC_P224_P).add(EC_P224_A).mul(x).umod(EC_P224_P).add(EC_P224_B).umod(EC_P224_P))) {
			throw new Error("Point does not lie on the expected curve");
		}

		return point;
	}

	/**
	 * @param   {BN[]} point
	 * @returns {Uint8Array}
	 */
	static encodeAffinePoint(point) {
		return new Uint8Array([ ...point[0].toArray(), ...point[1].toArray() ]);
	}

	/**
	 * @param   {Uint8Array} b
	 * @returns {Uint8Array}
	 */
	static unsignedToPositiveSigned(b) {
		if((b.length === 1 && b[0] === 0) || (b[0] & 128) === 0) {
			return b;
		}

		return new Uint8Array([ 0, ...b ]);
	}

	/**
	 * @param   {Uint8Array} commitment
	 * @returns {Uint8Array}
	 */
	computeKey(commitment) {
		if (commitment === null || commitment.length !== 56) {
			throw new Error("Incorrect commitment length");
		}

		const point1 = SpakeP224.validateEcP224CurvePointAffine([
			new BN(SpakeP224.unsignedToPositiveSigned(commitment.slice(0, 28))),
			new BN(SpakeP224.unsignedToPositiveSigned(commitment.slice(28, 56))),
		]);

		const point2 = SpakeP224.validateEcP224CurvePointAffine(SpakeP224.scalarMultiplyAffinePoint(this.#is_client ? KN : KM, this.#password_hash));
		const point3 = SpakeP224.validateEcP224CurvePointAffine(SpakeP224.subtractAffinePoint(point1, point2));
		const point4 = SpakeP224.validateEcP224CurvePointAffine(SpakeP224.scalarMultiplyAffinePoint(point3, this.#value_x));

		return SpakeP224.encodeAffinePoint(point4);
	}

	/**
	 * @returns {Uint8Array}
	 */
	computeCommitment() {
		const point1 = SpakeP224.validateEcP224CurvePointAffine(SpakeP224.scalarMultiplyAffinePoint(this.#is_client ? KM : KN, this.#password_hash));
		const point2 = SpakeP224.validateEcP224CurvePointAffine(SpakeP224.addAffinePoints(this.#point_x, point1));

		return SpakeP224.encodeAffinePoint(point2);
	}
}
