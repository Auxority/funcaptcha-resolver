export default class CaptchaPageFinder {
    public static gameToken(captchaPage: string): string | void {
        const foundMatches = captchaPage.match(/<input type="hidden" name="game-token" value="(.*?)"\/>/m);
        return foundMatches ? foundMatches[1] : undefined;
    }

    public static state(captchaPage: string): string | void {
        const foundMatches = captchaPage.match(/<input type="hidden" name="state" value="(.*?)"\/>/m);
        return foundMatches ? foundMatches[1].replace(/&quot;/g, `"`) : undefined;
    }

    public static sessionToken(captchaPage: string): string | void {
        const foundMatches = captchaPage.match(/<input type="hidden" name="session-token" value="(.*?)"\/>/m);
        return foundMatches ? foundMatches[1] : undefined;
    }

    public static challengeImage(captchaPage: string): string | void {
        const foundMatches = captchaPage.match(/<img class=".*?" id="challenge-image" src="(.*?)" aria-hidden="true"\/>/m);
        return foundMatches ? foundMatches[1].replace(/&amp;/g, '&') : undefined;
    }

    public static question(captchaPage: string): string | void {
        const foundMatches = captchaPage.match(/<legend class=".*?" id="game-header" tabindex="-1">(.*?)<\/legend>/m);
        return foundMatches ? foundMatches[1] : undefined;
    }

    public static progress(captchaPage: string): CaptchaProgress {
        const foundMatches = captchaPage.match(/<div class=".*?">([0-9]+) of ([0-9]+)<\/div>/);
        if (foundMatches) {
            return {
                current: Number(foundMatches[1]),
                final: Number(foundMatches[2])
            }
        }
        return {
            current: 0,
            final: 0
        }
    }

    public static failed(captchaPage: string): boolean {
        const foundMatches = captchaPage.match(/<button class=".*?" type="submit" name="fail" id="fail-button" aria-describedby="descriptionTryAgain">(.*?)<\/button>/m);
        return foundMatches !== null;
    }

    public static completed(captchaPage: string): boolean {
        const foundMatches = captchaPage.match(/<h2 class=".*?" dir="ltr" id="litejs-victory-header" tabindex="-1">(.*?)<\/h2>/);
        return foundMatches !== null;
    }
}