"""CDK stack for the codebase-tutorial static site.

Resources:
- S3 bucket (private, OAC)
- CloudFront distribution
- ACM certificate (us-east-1, DNS-validated)
- Route 53 alias against the apex zone you already own
- IAM role assumed by GitHub Actions via the account-level OIDC provider,
  scoped to a specific GitHub org/repo

Site-specific values (domain, GitHub repo, etc.) are passed in by app.py,
which reads them from environment variables. Nothing in this file hardcodes
a particular account or domain.
"""

from aws_cdk import (
    CfnOutput,
    Duration,
    RemovalPolicy,
    Stack,
    aws_certificatemanager as acm,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_iam as iam,
    aws_route53 as route53,
    aws_route53_targets as targets,
    aws_s3 as s3,
)
from constructs import Construct


class CodebaseTutorialStack(Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        domain: str,
        subdomain: str,
        github_org: str,
        github_repo: str,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        zone = route53.HostedZone.from_lookup(self, "Zone", domain_name=domain)

        certificate = acm.Certificate(
            self,
            "SiteCert",
            domain_name=subdomain,
            validation=acm.CertificateValidation.from_dns(zone),
        )

        site_bucket = s3.Bucket(
            self,
            "SiteBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
            object_ownership=s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
            removal_policy=RemovalPolicy.DESTROY,
        )

        # Static export with `trailingSlash: true` emits index.html at directory
        # paths (out/index.html, out/t/<slug>/index.html). CloudFront's S3 OAC
        # origin does NOT auto-resolve directory requests, so we rewrite paths
        # ending in `/` to `<path>/index.html` at the edge.
        uri_rewrite_fn = cloudfront.Function(
            self,
            "UriRewrite",
            code=cloudfront.FunctionCode.from_inline(
                """
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    if (uri.endsWith('/')) {
        request.uri = uri + 'index.html';
    } else if (!uri.split('/').pop().includes('.')) {
        request.uri = uri + '/index.html';
    }
    return request;
}
""".strip()
            ),
            runtime=cloudfront.FunctionRuntime.JS_2_0,
        )

        distribution = cloudfront.Distribution(
            self,
            "SiteDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(site_bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                compress=True,
                response_headers_policy=cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
                function_associations=[
                    cloudfront.FunctionAssociation(
                        function=uri_rewrite_fn,
                        event_type=cloudfront.FunctionEventType.VIEWER_REQUEST,
                    ),
                ],
            ),
            domain_names=[subdomain],
            certificate=certificate,
            default_root_object="index.html",
            minimum_protocol_version=cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            error_responses=[
                # Real 404s show the Next.js 404 page (not the home page —
                # masking missing routes as a 200 home is bad UX). S3 with OAC
                # returns 403 for non-existent keys, so map both.
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=404,
                    response_page_path="/404.html",
                    ttl=Duration.seconds(0),
                ),
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=404,
                    response_page_path="/404.html",
                    ttl=Duration.seconds(0),
                ),
            ],
        )

        route53.ARecord(
            self,
            "SubdomainAlias",
            zone=zone,
            record_name=subdomain,
            target=route53.RecordTarget.from_alias(
                targets.CloudFrontTarget(distribution)
            ),
        )

        oidc_provider = iam.OpenIdConnectProvider.from_open_id_connect_provider_arn(
            self,
            "GitHubOidc",
            f"arn:aws:iam::{self.account}:oidc-provider/token.actions.githubusercontent.com",
        )

        # Scoped to this repo specifically — does NOT reuse other repos'
        # roles, so they can deploy independently.
        deploy_role = iam.Role(
            self,
            "GitHubActionsRole",
            assumed_by=iam.FederatedPrincipal(
                oidc_provider.open_id_connect_provider_arn,
                conditions={
                    "StringEquals": {
                        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                    },
                    "StringLike": {
                        "token.actions.githubusercontent.com:sub": f"repo:{github_org}/{github_repo}:*",
                    },
                },
                assume_role_action="sts:AssumeRoleWithWebIdentity",
            ),
            description="Role assumed by GitHub Actions for codebase-tutorial deployments",
        )

        site_bucket.grant_read_write(deploy_role)
        site_bucket.grant_delete(deploy_role)

        deploy_role.add_to_policy(
            iam.PolicyStatement(
                actions=["cloudfront:CreateInvalidation"],
                resources=[
                    f"arn:aws:cloudfront::{self.account}:distribution/{distribution.distribution_id}"
                ],
            )
        )

        # Modern CDK delegates all CloudFormation, IAM, and asset-upload work
        # to the bootstrap roles; the CI principal only needs to assume them.
        # The qualifier `hnb659fds` is the default created by `cdk bootstrap`.
        cdk_qualifier = "hnb659fds"
        cdk_role_arns = [
            f"arn:aws:iam::{self.account}:role/cdk-{cdk_qualifier}-{purpose}-{self.account}-{self.region}"
            for purpose in (
                "deploy-role",
                "file-publishing-role",
                "lookup-role",
            )
        ]
        deploy_role.add_to_policy(
            iam.PolicyStatement(
                actions=["sts:AssumeRole"],
                resources=cdk_role_arns,
            )
        )

        CfnOutput(self, "SiteBucketName", value=site_bucket.bucket_name)
        CfnOutput(self, "DistributionId", value=distribution.distribution_id)
        CfnOutput(self, "SiteUrl", value=f"https://{subdomain}")
        CfnOutput(self, "GitHubActionsRoleArn", value=deploy_role.role_arn)
